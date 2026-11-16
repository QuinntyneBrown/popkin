using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.FollowUps;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Timeline;

/// <summary>One row of a contact's timeline (L2-135 AC1): a conversation's channel, a milestone's kind and title.</summary>
public sealed record TimelineItemDto(
    Guid Id,
    TimelineEntryKind Kind,
    DateOnly Day,
    TalkChannel? Channel,
    MilestoneKind? MilestoneKind,
    string? Title,
    string? Note)
{
    public static TimelineItemDto Of(TimelineEntry entry) =>
        new(entry.Id, entry.Kind, entry.Day, entry.Channel, entry.MilestoneKind, entry.Title, entry.Note);
}

public sealed record TimelineDto(IReadOnlyList<TimelineItemDto> Entries);

/// <summary>A conversation's entry, and the key date a yearly milestone added.</summary>
public sealed record TimelineEntryDto(TimelineItemDto Entry, Guid? KeyDateId);

public sealed record PromiseDraft(string? Text, string? DueOn);

/// <summary>"Talked with {first name}": logged at the moment Log opened, with what was promised (L2-133).</summary>
public sealed record LogConversationRequest(
    Guid ClientId, TalkChannel Channel, DateTimeOffset LoggedAt, string? Note, IReadOnlyList<PromiseDraft>? Promises);

/// <summary>"{first name}'s milestone" (L2-134): the day as `yyyy-MM-dd`.</summary>
public sealed record LogMilestoneRequest(
    Guid ClientId, MilestoneKind Kind, string? Title, string? HappenedOn, string? Note, bool EveryYear);

/// <summary>"All", "Conversations" or "Milestones" (L2-135 AC1).</summary>
public enum TimelineShow
{
    All,
    Conversations,
    Milestones,
}

/// <summary>What an entry must be (L2-133 AC4, known gap 106 ruled).</summary>
public static class TimelineRules
{
    public static string Note(string? note)
    {
        var trimmed = string.IsNullOrWhiteSpace(note)
            ? throw ProblemException.Invalid("note_required", "Write a line or two, so you remember it later.", "note")
            : note.Trim();
        return trimmed.Length <= TimelineEntry.MaxNoteLength ? trimmed : throw NoteTooLong();
    }

    public static string? OptionalNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return null;
        }

        var trimmed = note.Trim();
        return trimmed.Length <= TimelineEntry.MaxNoteLength ? trimmed : throw NoteTooLong();
    }

    public static string Title(string? title)
    {
        var trimmed = string.IsNullOrWhiteSpace(title)
            ? throw ProblemException.Invalid("title_required", "Say what happened.", "title")
            : title.Trim();
        return trimmed.Length <= TimelineEntry.MaxTitleLength
            ? trimmed
            : throw ProblemException.Invalid("title_too_long", $"Keep it to {TimelineEntry.MaxTitleLength} characters.", "title");
    }

    public static DateOnly HappenedOn(string? day) =>
        DateOnly.TryParseExact(day, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var on)
            ? on
            : throw ProblemException.Invalid("happened_on_required", "Say when it happened.", "happenedOn");

    /// <summary>Each promise's words, 1 to 200 characters, and its day, which it must have.</summary>
    public static IReadOnlyList<(string Text, DateOnly DueOn)> Promises(IReadOnlyList<PromiseDraft>? promises) =>
        (promises ?? []).Select(p =>
        {
            var text = FollowUp.Trimmed(p.Text)
                ?? throw ProblemException.Invalid("promise_text_required", "Say what you’ll do, so it goes on your follow-ups.", "promises");
            if (text.Length > FollowUp.MaxTextLength)
            {
                throw ProblemException.Invalid("promise_text_too_long", $"Keep it to {FollowUp.MaxTextLength} characters.", "promises");
            }

            var due = FollowUpRules.Due(p.DueOn)
                ?? throw ProblemException.Invalid("promise_due_required", "Say when to remind you.", "promises");
            return (text, due);
        }).ToList();

    private static ProblemException NoteTooLong() =>
        ProblemException.Invalid("note_too_long", $"Keep it to {TimelineEntry.MaxNoteLength} characters.", "note");
}

public sealed record LogConversationCommand(Guid ContactId, LogConversationRequest Conversation) : IRequest<LoggedEntry>;

public sealed record LogMilestoneCommand(Guid ContactId, LogMilestoneRequest Milestone) : IRequest<LoggedEntry>;

/// <summary>The entry, and whether this request saved it (201) or a resend found it (200).</summary>
public sealed record LoggedEntry(TimelineEntryDto Entry, bool Created);

/// <summary>Saves the conversation and one promise follow-up per row, in one save (L2-133 AC2).</summary>
public sealed class LogConversationCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, TimeProvider clock)
    : IRequestHandler<LogConversationCommand, LoggedEntry>
{
    public async Task<LoggedEntry> Handle(LogConversationCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var body = request.Conversation;
        if (await ClientWrites.FindAsync(db.TimelineEntries, owner, body.ClientId, cancellationToken) is { } saved)
        {
            return new LoggedEntry(new TimelineEntryDto(TimelineItemDto.Of(saved), null), false);
        }

        var note = TimelineRules.Note(body.Note);
        var promises = TimelineRules.Promises(body.Promises);
        var now = clock.GetUtcNow();
        // The day on the owner's clock, as the device sent it.
        var day = DateOnly.FromDateTime(body.LoggedAt.DateTime);
        var entry = TimelineEntry.LogConversation(owner, body.ClientId, contact.Id, body.Channel, day, note, now);
        db.TimelineEntries.Add(entry);
        foreach (var (text, dueOn) in promises)
        {
            db.FollowUps.Add(FollowUp.Promise(owner, Guid.NewGuid(), contact.Id, text, dueOn, body.Channel, day, entry.Id, now));
        }

        await db.SaveChangesAsync(cancellationToken);
        return new LoggedEntry(new TimelineEntryDto(TimelineItemDto.Of(entry), null), true);
    }
}

/// <summary>Saves the milestone and, with "Remember this every year", its yearly key date (L2-134 AC2).</summary>
public sealed class LogMilestoneCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, TimeProvider clock)
    : IRequestHandler<LogMilestoneCommand, LoggedEntry>
{
    public async Task<LoggedEntry> Handle(LogMilestoneCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var body = request.Milestone;
        if (await ClientWrites.FindAsync(db.TimelineEntries, owner, body.ClientId, cancellationToken) is { } saved)
        {
            return new LoggedEntry(new TimelineEntryDto(TimelineItemDto.Of(saved), null), false);
        }

        var title = TimelineRules.Title(body.Title);
        var day = TimelineRules.HappenedOn(body.HappenedOn);
        var note = TimelineRules.OptionalNote(body.Note);
        var now = clock.GetUtcNow();
        var entry = TimelineEntry.LogMilestone(owner, body.ClientId, contact.Id, body.Kind, title, day, note, now);
        db.TimelineEntries.Add(entry);
        Guid? keyDateId = null;
        if (body.EveryYear)
        {
            var yearly = TimelineEntry.YearlyTitle(body.Kind, PersonName.FirstName(contact.Name), title);
            var lead = (await KeyDateRules.PreferencesAsync(db, owner, cancellationToken)).DefaultFor(KeyDateKind.Milestone);
            var keyDate = KeyDate.Create(
                owner,
                Guid.NewGuid(),
                contact.Id,
                KeyDateKind.Milestone,
                yearly.Length <= KeyDate.MaxTitleLength ? yearly : yearly[..KeyDate.MaxTitleLength],
                day.Month,
                day.Day,
                day.Year,
                everyYear: true,
                lead,
                now);
            db.KeyDates.Add(keyDate);
            keyDateId = keyDate.Id;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new LoggedEntry(new TimelineEntryDto(TimelineItemDto.Of(entry), keyDateId), true);
    }
}

/// <summary>A contact's timeline, newest first: every entry, no paging (known gap 106, ruled).</summary>
public sealed record GetContactTimelineQuery(Guid ContactId, TimelineShow Show) : IRequest<TimelineDto>;

public sealed class GetContactTimelineQueryHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard)
    : IRequestHandler<GetContactTimelineQuery, TimelineDto>
{
    public async Task<TimelineDto> Handle(GetContactTimelineQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var entries = await db.TimelineEntries.OwnedBy(current.PersonId).AsNoTracking()
            .Where(e => e.ContactId == contact.Id)
            .ToListAsync(cancellationToken);
        return new TimelineDto(Filter(entries, request.Show)
            .OrderByDescending(e => e.Day)
            .ThenByDescending(e => e.CreatedAt)
            .Select(TimelineItemDto.Of)
            .ToList());
    }

    public static IEnumerable<TimelineEntry> Filter(IEnumerable<TimelineEntry> entries, TimelineShow show) => show switch
    {
        TimelineShow.Conversations => entries.Where(e => e.Kind == TimelineEntryKind.Conversation),
        TimelineShow.Milestones => entries.Where(e => e.Kind == TimelineEntryKind.Milestone),
        _ => entries,
    };
}
