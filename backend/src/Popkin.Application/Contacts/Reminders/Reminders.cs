using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Reminders;

/// <summary>An in-app reminder (L2-140 AC1): its words, and the contact it opens.</summary>
public sealed record ContactReminderDto(Guid Id, ReminderKind Kind, Guid? ContactId, string? FirstName, string Words, DateOnly DueOn);

/// <summary>The caller's undismissed reminders whose subject is still kept, oldest first.</summary>
public sealed record GetContactRemindersQuery : IRequest<IReadOnlyList<ContactReminderDto>>;

public sealed record DismissContactReminderCommand(Guid ReminderId) : IRequest;

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

