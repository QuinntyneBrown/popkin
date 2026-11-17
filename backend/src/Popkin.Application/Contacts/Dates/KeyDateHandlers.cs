using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Dates;

/// <summary>
/// Dates (L2-137): the next occurrence of every key date of the caller's, at most a year ahead,
/// soonest first, filtered by `kind` (all, birthdays, anniversaries, milestones; known gap 103).
/// </summary>
public sealed record GetContactDatesQuery(string? On, string? Kind) : IRequest<ContactDatesDto>;

public sealed class GetContactDatesQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetContactDatesQuery, ContactDatesDto>
{
    public async Task<ContactDatesDto> Handle(GetContactDatesQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var today = ContactsDayValidator.Parse(request.On);
        Func<KeyDateKind, bool> shown = (request.Kind ?? "all") switch
        {
            "all" => _ => true,
            "birthdays" => k => k == KeyDateKind.Birthday,
            "anniversaries" => k => k == KeyDateKind.Anniversary,
            "milestones" => k => k is KeyDateKind.Milestone or KeyDateKind.Other,
            _ => throw ProblemException.Invalid("kind_not_allowed", "Choose what to show.", "kind"),
        };
        var owner = current.PersonId;
        var dates = await db.KeyDates.OwnedBy(owner).AsNoTracking().ToListAsync(cancellationToken);
        var people = await db.Contacts.OwnedBy(owner).AsNoTracking().ToDictionaryAsync(c => c.Id, cancellationToken);
        var horizon = today.AddYears(1);
        var rows = dates
            .Where(d => shown(d.Kind) && people.ContainsKey(d.ContactId))
            .Select(d => (Date: d, Next: d.NextOccurrence(today)))
            .Where(x => x.Next is { } next && next < horizon)
            .OrderBy(x => x.Next)
            .ThenBy(x => people[x.Date.ContactId].Name, StringComparer.OrdinalIgnoreCase)
            .Select(x => KeyDateRules.Row(x.Date, people[x.Date.ContactId], x.Next!.Value, today, photos))
            .ToList();
        return new ContactDatesDto(rows, ReminderPreferencesDto.Of(await KeyDateRules.PreferencesAsync(db, owner, cancellationToken)));
    }
}

/// <summary>
/// Add a date (L2-138) for one of the caller's contacts. A missing lead takes the owner's default
/// for the kind (L2-139 AC2). A resend under the same client id answers the date already saved.
/// </summary>
public sealed record AddKeyDateCommand(Guid ContactId, AddKeyDateRequest Date) : IRequest<AddedKeyDate>;

public sealed record AddedKeyDate(KeyDateRowDto Row, bool Created);

public sealed class AddKeyDateCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddKeyDateCommand, AddedKeyDate>
{
    public async Task<AddedKeyDate> Handle(AddKeyDateCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var owner = current.PersonId;
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (await ClientWrites.FindAsync(db.KeyDates, owner, request.Date.ClientId, cancellationToken) is { } saved)
        {
            return new AddedKeyDate(KeyDateRules.Row(saved, contact, today, photos), false);
        }

        var kind = KeyDateRules.Kind(request.Date.Kind);
        var (month, day) = KeyDateRules.Day(request.Date);
        var lead = request.Date.Lead is null
            ? (await KeyDateRules.PreferencesAsync(db, owner, cancellationToken)).DefaultFor(kind)
            : KeyDateRules.Lead(request.Date.Lead);
        var date = KeyDate.Create(
            owner, request.Date.ClientId, contact.Id, kind, request.Date.Title, month, day, request.Date.Year, request.Date.EveryYear, lead, clock.GetUtcNow());
        db.KeyDates.Add(date);
        await db.SaveChangesAsync(cancellationToken);
        return new AddedKeyDate(KeyDateRules.Row(date, contact, today, photos), true);
    }
}

/// <summary>
/// One date's own reminder: its lead (L2-139 AC3) and whether it reminds at all (L2-159 AC4). No
/// other date changes. Dates, the profile and Notifications › People all change it here.
/// </summary>
public sealed record ChangeKeyDateReminderCommand(Guid KeyDateId, string? Lead, bool? On = null) : IRequest<ContactKeyDateDto>;

public sealed class ChangeKeyDateReminderCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, TimeProvider clock)
    : IRequestHandler<ChangeKeyDateReminderCommand, ContactKeyDateDto>
{
    public async Task<ContactKeyDateDto> Handle(ChangeKeyDateReminderCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        if (request.Lead is null && request.On is null)
        {
            throw new ProblemException(400, "nothing_to_change", "Say how early to remind, or whether to.");
        }

        var lead = request.Lead is null ? (ReminderLead?)null : KeyDateRules.Lead(request.Lead);
        var date = await KeyDateRules.RequireOwnedAsync(db, current.PersonId, request.KeyDateId, cancellationToken);
        if (lead is { } chosen)
        {
            date.ChangeLead(chosen);
        }

        if (request.On is { } on)
        {
            date.TurnReminders(on);
        }

        await db.SaveChangesAsync(cancellationToken);
        return KeyDateRules.ForProfile([date], DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime))[0];
    }
}

/// <summary>Removes one key date of the caller's (Add someone's "Remove the {kind}").</summary>
public sealed record RemoveKeyDateCommand(Guid KeyDateId) : IRequest;

public sealed class RemoveKeyDateCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<RemoveKeyDateCommand>
{
    public async Task Handle(RemoveKeyDateCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        db.KeyDates.Remove(await KeyDateRules.RequireOwnedAsync(db, current.PersonId, request.KeyDateId, cancellationToken));
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>The caller's reminder preferences; an owner without a row has the defaults (L2-139 AC1).</summary>
public sealed record GetReminderPreferencesQuery : IRequest<ReminderPreferencesDto>;

public sealed class GetReminderPreferencesQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<GetReminderPreferencesQuery, ReminderPreferencesDto>
{
    public async Task<ReminderPreferencesDto> Handle(GetReminderPreferencesQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        return ReminderPreferencesDto.Of(await KeyDateRules.PreferencesAsync(db, current.PersonId, cancellationToken));
    }
}

/// <summary>Saves the caller's defaults (L2-139 AC2); no kept date changes.</summary>
public sealed record SaveReminderPreferencesCommand(SaveReminderPreferencesRequest Preferences) : IRequest<ReminderPreferencesDto>;

public sealed class SaveReminderPreferencesCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<SaveReminderPreferencesCommand, ReminderPreferencesDto>
{
    public async Task<ReminderPreferencesDto> Handle(SaveReminderPreferencesCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var p = request.Preferences;
        var birthday = KeyDateRules.Lead(p.BirthdayLead, "birthdayLead");
        var anniversary = KeyDateRules.Lead(p.AnniversaryLead, "anniversaryLead");
        var milestone = KeyDateRules.Lead(p.MilestoneLead, "milestoneLead");
        var owner = current.PersonId;
        var row = await db.ReminderPreferences.OwnedBy(owner).FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            row = ReminderPreferences.Defaults(owner);
            db.ReminderPreferences.Add(row);
        }

        row.Change(birthday, anniversary, milestone);
        await db.SaveChangesAsync(cancellationToken);
        return ReminderPreferencesDto.Of(row);
    }
}
