using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Reminders;

/// <summary>An in-app reminder (L2-140 AC1): its words, and the contact it opens.</summary>
public sealed record ContactReminderDto(Guid Id, ReminderKind Kind, Guid? ContactId, string? FirstName, string Words, DateOnly DueOn);

/// <summary>Web Push's public key (ADR 0028); empty while none is configured.</summary>
public sealed record PushPublicKey(string Value);

public sealed record PushKeyDto(string PublicKey);

public sealed record SaveTimeZoneRequest(string? Zone);

public sealed record SavePushSubscriptionRequest(string? Endpoint, string? P256dh, string? Auth);

/// <summary>The caller's undismissed reminders whose subject is still kept, oldest first.</summary>
public sealed record GetContactRemindersQuery : IRequest<IReadOnlyList<ContactReminderDto>>;

public sealed record DismissContactReminderCommand(Guid ReminderId) : IRequest;

/// <summary>The device's IANA zone, saved each time Contacts opens: 9 am is 9 am there.</summary>
public sealed record SaveTimeZoneCommand(SaveTimeZoneRequest Request) : IRequest;

public sealed record GetPushKeyQuery : IRequest<PushKeyDto>;

/// <summary>A device that allowed notifications (ADR 0028), saved once per endpoint.</summary>
public sealed record SavePushSubscriptionCommand(SavePushSubscriptionRequest Request) : IRequest;

public sealed record RemovePushSubscriptionCommand(string? Endpoint) : IRequest;

public sealed class GetContactRemindersQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<GetContactRemindersQuery, IReadOnlyList<ContactReminderDto>>
{
    public async Task<IReadOnlyList<ContactReminderDto>> Handle(GetContactRemindersQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var reminders = await db.ContactReminders.OwnedBy(owner)
            .Where(r => r.DismissedAt == null)
            .Where(r => (r.Kind == ReminderKind.KeyDate && db.KeyDates.Any(d => d.Id == r.SubjectId))
                || (r.Kind == ReminderKind.FollowUp && db.FollowUps.Any(f => f.Id == r.SubjectId && f.DoneAt == null))
                || (r.Kind == ReminderKind.Habit && db.Habits.Any(h => h.Id == r.SubjectId && h.EndedAt == null)))
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        var ids = reminders.Select(r => r.ContactId).OfType<Guid>().Distinct().ToList();
        var names = await db.Contacts.OwnedBy(owner).Where(c => ids.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToDictionaryAsync(c => c.Id, c => PersonName.FirstName(c.Name), cancellationToken);
        return reminders
            .Select(r => new ContactReminderDto(
                r.Id, r.Kind, r.ContactId, r.ContactId is { } id && names.TryGetValue(id, out var first) ? first : null, r.Words, r.DueOn))
            .ToList();
    }
}

public sealed class DismissContactReminderCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, TimeProvider clock)
    : IRequestHandler<DismissContactReminderCommand>
{
    public async Task Handle(DismissContactReminderCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var reminder = await db.ContactReminders.OwnedBy(current.PersonId)
            .SingleOrDefaultAsync(r => r.Id == request.ReminderId, cancellationToken)
            ?? throw new ProblemException(404, "reminder_not_found", "That reminder isn't yours or has gone.");
        reminder.Dismiss(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class SaveTimeZoneCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<SaveTimeZoneCommand>
{
    public async Task Handle(SaveTimeZoneCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var zone = request.Request.Zone?.Trim();
        if (zone is not { Length: > 0 and <= 64 } || ReminderRules.TryZone(zone) is null)
        {
            throw new ProblemException(400, "invalid_time_zone", "That isn't a time zone.");
        }

        var owner = current.PersonId;
        var row = await db.ReminderPreferences.OwnedBy(owner).FirstOrDefaultAsync(cancellationToken);
        if (row is null)
        {
            row = ReminderPreferences.Defaults(owner);
            db.ReminderPreferences.Add(row);
        }

        if (row.TimeZone != zone)
        {
            row.ChangeTimeZone(zone);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}

public sealed class GetPushKeyQueryHandler(PushPublicKey key, ContactsSwitch contacts) : IRequestHandler<GetPushKeyQuery, PushKeyDto>
{
    public Task<PushKeyDto> Handle(GetPushKeyQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        return Task.FromResult(new PushKeyDto(key.Value));
    }
}

public sealed class SavePushSubscriptionCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, TimeProvider clock)
    : IRequestHandler<SavePushSubscriptionCommand>
{
    public async Task Handle(SavePushSubscriptionCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var (endpoint, p256dh, auth) = (request.Request.Endpoint?.Trim(), request.Request.P256dh?.Trim(), request.Request.Auth?.Trim());
        if (endpoint is not { Length: > 0 and <= PushSubscription.MaxEndpointLength }
            || !Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps
            || p256dh is not { Length: > 0 and <= PushSubscription.MaxKeyLength }
            || auth is not { Length: > 0 and <= PushSubscription.MaxKeyLength })
        {
            throw new ProblemException(400, "invalid_push_subscription", "That isn't a push subscription.");
        }

        var row = await db.PushSubscriptions.SingleOrDefaultAsync(s => s.Endpoint == endpoint, cancellationToken);
        if (row is null)
        {
            db.PushSubscriptions.Add(PushSubscription.Subscribe(current.PersonId, endpoint, p256dh, auth, clock.GetUtcNow()));
        }
        else
        {
            row.Renew(current.PersonId, p256dh, auth);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class RemovePushSubscriptionCommandHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<RemovePushSubscriptionCommand>
{
    public async Task Handle(RemovePushSubscriptionCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var row = await db.PushSubscriptions
            .SingleOrDefaultAsync(s => s.Endpoint == request.Endpoint && s.PersonId == current.PersonId, cancellationToken);
        if (row is not null)
        {
            db.PushSubscriptions.Remove(row);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
