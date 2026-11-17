using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications;
using Popkin.Application.Telemetry;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Reminders;

/// <summary>Sent by the Worker every few minutes: adds and sends what is due (L2-140).</summary>
public sealed record SendContactRemindersCommand : IRequest<int>;

/// <summary>
/// For each owner, from 9 am where they are: adds the day's in-app reminders once (a key date from
/// its reminder day, a follow-up on its due day, a habit on its due day and the day after), and
/// sends each new one to the phone when the "Birthdays" kind is on for the phone (L2-140, as
/// changed 17 November 2026: no Monday email). Saves after each owner, so one failure stops that
/// owner only. Answers the reminders added.
/// </summary>
public sealed class SendContactRemindersCommandHandler(
    IAppDbContext db,
    TimeProvider clock,
    ContactsSwitch contacts,
    IPhoneNotificationSender phone,
    PopkinMetrics metrics,
    ILogger<SendContactRemindersCommandHandler> logger)
    : IRequestHandler<SendContactRemindersCommand, int>
{
    public async Task<int> Handle(SendContactRemindersCommand request, CancellationToken cancellationToken)
    {
        if (!contacts.On)
        {
            return 0;
        }

        var owners = await db.Contacts.Select(c => c.OwnerId).Distinct().ToListAsync(cancellationToken);
        var added = 0;
        foreach (var owner in owners)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                added += await RemindAsync(owner, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "The reminders of one owner could not be sent");
            }
        }

        return added;
    }

    private async Task<int> RemindAsync(Guid owner, CancellationToken cancellationToken)
    {
        if (!await db.People.AnyAsync(p => p.Id == owner && p.DeletedAt == null, cancellationToken))
        {
            return 0;
        }

        var now = clock.GetUtcNow();
        var notifications = await db.NotificationPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.PersonId == owner, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == owner).ToListAsync(cancellationToken);
        var phoneOn = new EffectiveNotificationSettings(notifications, choices).IsOn(NotificationKind.Birthdays, NotificationChannel.Phone);
        var local = ReminderRules.LocalNow(notifications?.TimeZone, now);
        if (!ReminderRules.IsTime(local))
        {
            return 0;
        }

        var today = DateOnly.FromDateTime(local.DateTime);
        var people = await db.Contacts.OwnedBy(owner)
            .Select(c => new { c.Id, c.Name })
            .ToDictionaryAsync(c => c.Id, c => PersonName.FirstName(c.Name), cancellationToken);
        var dates = (await db.KeyDates.OwnedBy(owner).ToListAsync(cancellationToken))
            .Where(d => people.ContainsKey(d.ContactId))
            .Select(d => (Date: d, On: d.NextOccurrence(today)))
            .Where(o => o.On is not null)
            .Select(o => (o.Date, On: o.On!.Value))
            .ToList();

        var due = new List<ContactReminder>();
        foreach (var (date, on) in dates.Where(o => o.Date.ReminderDay(o.On) <= today))
        {
            due.Add(ContactReminder.Add(owner, ReminderKind.KeyDate, date.Id, date.ContactId, on,
                ReminderRules.DateWords(date, people[date.ContactId], on, today), now));
        }

        var followUps = await db.FollowUps.OwnedBy(owner)
            .Where(f => f.DoneAt == null && f.DueOn == today)
            .ToListAsync(cancellationToken);
        foreach (var followUp in followUps.Where(f => f.ContactId is null || people.ContainsKey(f.ContactId.Value)))
        {
            due.Add(ContactReminder.Add(owner, ReminderKind.FollowUp, followUp.Id, followUp.ContactId, today,
                ReminderRules.FollowUpWords(followUp.Text), now));
        }

        var habits = await db.Habits.OwnedBy(owner).Include(h => h.Kept).Where(h => h.EndedAt == null).ToListAsync(cancellationToken);
        foreach (var habit in habits.Where(h => people.ContainsKey(h.ContactId)))
        {
            var habitDue = habit.DueOn();
            if (habitDue == today || habitDue.AddDays(1) == today)
            {
                due.Add(ContactReminder.Add(owner, ReminderKind.Habit, habit.Id, habit.ContactId, today,
                    ReminderRules.HabitWords(habit.What, people[habit.ContactId], overdue: habitDue != today), now));
            }
        }

        var subjects = due.Select(r => r.SubjectId).ToList();
        var existing = (await db.ContactReminders.OwnedBy(owner)
                .Where(r => subjects.Contains(r.SubjectId))
                .Select(r => new { r.Kind, r.SubjectId, r.DueOn })
                .ToListAsync(cancellationToken))
            .Select(r => (r.Kind, r.SubjectId, r.DueOn))
            .ToHashSet();
        var fresh = due.Where(r => !existing.Contains((r.Kind, r.SubjectId, r.DueOn))).ToList();
        db.ContactReminders.AddRange(fresh);
        await db.SaveChangesAsync(cancellationToken);
        metrics.RemindersSent("in_app", fresh.Count);

        var unsent = await db.ContactReminders.OwnedBy(owner)
            .Where(r => r.NotifiedAt == null)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
        try
        {
            foreach (var reminder in unsent)
            {
                if (phoneOn)
                {
                    await SendAsync("phone", () => phone.SendAsync(owner, new PhoneAlert(reminder.Words, "", reminder.ContactId is { } id ? $"/contacts/people/{id}" : "/contacts"), cancellationToken));
                }

                reminder.MarkNotified(now);
                await db.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // The rest wait for the next tick; the in-app reminders stand.
            logger.LogWarning(exception, "The phone reminders of one owner could not be sent");
        }

        return fresh.Count;
    }

    private async Task SendAsync(string channel, Func<Task> send)
    {
        try
        {
            await send();
            metrics.RemindersSent(channel, 1);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            metrics.ReminderSendFailed(channel);
            throw;
        }
    }
}
