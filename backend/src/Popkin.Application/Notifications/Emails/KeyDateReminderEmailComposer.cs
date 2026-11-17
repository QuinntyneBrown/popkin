using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Reminders;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Emails;

/// <summary>
/// Builds the key date reminder from what the owner keeps about the contact, read as it is now:
/// a reminder whose contact or date is gone gives no email (send-reminders, L2-166). It goes to
/// the owner only, names nobody but their own contact, and logs nothing of it (AC7).
/// </summary>
public sealed class KeyDateReminderEmailComposer(IAppDbContext db, NotificationLinks links, NotificationEmailSettings settings)
{
    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");

    public async Task<KeyDateReminderEmailModel?> ComposeAsync(OutgoingEmail email, NotificationEvent notification, CancellationToken cancellationToken)
    {
        var reminder = await db.ContactReminders.AsNoTracking()
            .SingleOrDefaultAsync(r => r.Id == notification.SubjectId && r.OwnerId == email.PersonId && r.Kind == ReminderKind.KeyDate, cancellationToken);
        var date = reminder is null
            ? null
            : await db.KeyDates.AsNoTracking().SingleOrDefaultAsync(d => d.Id == reminder.SubjectId && d.OwnerId == email.PersonId, cancellationToken);
        var contact = date is null
            ? null
            : await db.Contacts.AsNoTracking().SingleOrDefaultAsync(c => c.Id == date.ContactId && c.OwnerId == email.PersonId, cancellationToken);
        if (reminder is null || date is null || contact is null)
        {
            return null;
        }

        // A key date's reminder is due on the occurrence; "today" is the day it was made, where the person is.
        var occursOn = reminder.DueOn;
        var zone = await db.NotificationPreferences.Where(p => p.PersonId == email.PersonId).Select(p => p.TimeZone).SingleOrDefaultAsync(cancellationToken);
        var madeOn = DateOnly.FromDateTime(ReminderRules.LocalNow(zone, reminder.CreatedAt).DateTime);
        var name = PersonName.FirstName(contact.Name);
        var today = occursOn == madeOn;
        var age = date.Kind == KeyDateKind.Birthday ? date.YearsOn(occursOn) : null;
        var day = occursOn.ToString("ddd d MMM", English);
        var talk = await db.TimelineEntries.AsNoTracking()
            .Where(t => t.OwnerId == email.PersonId && t.ContactId == contact.Id && t.Kind == TimelineEntryKind.Conversation)
            .OrderByDescending(t => t.Day).ThenByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var followUp = today
            ? null
            : await db.FollowUps.AsNoTracking()
                .Where(f => f.OwnerId == email.PersonId && f.ContactId == contact.Id && f.DoneAt == null && f.DueOn != null && f.DueOn <= occursOn)
                .OrderBy(f => f.DueOn)
                .FirstOrDefaultAsync(cancellationToken);
        var page = new EmailLink(today ? $"{name}’s page" : $"Open {name}’s page", links.Contact(contact.Id));
        var shell = new EmailShellModel(
            Subject(date, name, occursOn, today),
            age is { } years ? $"Turns {years}. Here’s what you keep about {name}." : $"On {occursOn.DayOfWeek}. Here’s what you keep about {name}.",
            "Popkin",
            Popkin: null,
            $"You asked to be reminded {LeadWords(date.Lead)} {contact.Name}’s {KindWords(date)}, from your contacts.",
            new EmailLink($"Stop birthday reminders for {name}", links.StopBirthday(date.Id)),
            links.Settings(),
            links.Unsubscribe(email.PersonId),
            settings.PostalAddress);
        return new KeyDateReminderEmailModel(
            shell,
            today ? TodayWords(date, name, occursOn) : ReminderRules.DateWords(date, name, occursOn, madeOn),
            string.Join(" · ", new[] { day, contact.HowWeMet, contact.City }.Where(p => !string.IsNullOrWhiteSpace(p))),
            age,
            Initials(contact.Name),
            contact.PhotoKey is { } key ? new EmailPicture("contact", key, "") : null,
            $"Things {name} loves, from your notes",
            contact.Loves,
            talk is null
                ? null
                : new LastTalk(
                    $"Last time you talked · {talk.Day.ToString("ddd d MMM", English)}",
                    talk.Title,
                    talk.Note is { } note ? EmailText.Cut(note, EmailText.MaxText) : null),
            followUp is null ? null : new OnYourList(followUp.Text, $"You planned it for {followUp.DueOn!.Value.ToString("dddd d MMMM", English)}"),
            today ? new EmailLink("Say happy birthday", links.Contact(contact.Id)) : page,
            today ? page : null);
    }

    /// <summary>"Grace’s birthday is Saturday, Sep 19" ahead, "Today: Grace’s birthday" on the day.</summary>
    public static string Subject(KeyDate date, string name, DateOnly occursOn, bool today)
    {
        var what = date.Kind switch
        {
            KeyDateKind.Birthday => $"{name}’s birthday",
            KeyDateKind.Anniversary => $"{name}’s anniversary",
            _ => date.Title ?? $"{name}’s day",
        };
        return today ? $"Today: {what}" : $"{what} is {occursOn.ToString("dddd", English)}, {occursOn.ToString("MMM d", English)}";
    }

    /// <summary>"It’s Grace’s birthday today", or the date's own title, "… is today".</summary>
    public static string TodayWords(KeyDate date, string name, DateOnly occursOn) => date.Kind switch
    {
        KeyDateKind.Birthday when date.YearsOn(occursOn) is { } years => $"{name} turns {years} today",
        KeyDateKind.Birthday => $"It’s {name}’s birthday today",
        KeyDateKind.Anniversary => $"It’s {name}’s anniversary today",
        _ => $"{date.Title ?? $"{name}’s day"} is today",
    };

    /// <summary>"1 week before", or "on the day of" (email-birthday mocks).</summary>
    public static string LeadWords(ReminderLead lead) => lead switch
    {
        ReminderLead.OnTheDay => "on the day of",
        ReminderLead.OneDayBefore => "1 day before",
        ReminderLead.ThreeDaysBefore => "3 days before",
        ReminderLead.OneWeekBefore => "1 week before",
        ReminderLead.TwoWeeksBefore => "2 weeks before",
        _ => "1 month before",
    };

    private static string KindWords(KeyDate date) => date.Kind switch
    {
        KeyDateKind.Birthday => "birthday",
        KeyDateKind.Anniversary => "anniversary",
        _ => date.Title ?? "day",
    };

    private static string Initials(string name) =>
        string.Concat(name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2).Select(w => char.ToUpperInvariant(w[0])));
}
