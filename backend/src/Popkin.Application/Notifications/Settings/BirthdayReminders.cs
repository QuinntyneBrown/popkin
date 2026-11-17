using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts;
using Popkin.Application.Contacts.Reminders;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Settings;

/// <summary>One birthday on the People view: its next day, the age, the days left, its lead and switch (L2-159 AC1).</summary>
public sealed record BirthdayReminderDto(
    Guid KeyDateId,
    Guid ContactId,
    string Name,
    string? PhotoUrl,
    string Initials,
    PopkinColour Accent,
    DateOnly OccursOn,
    int? Turns,
    int InDays,
    ReminderLead Lead,
    bool RemindersOn);

/// <summary>
/// The owner's birthdays, soonest next occurrence first, each counted from today where the person
/// is (birthday-reminders-by-person). The owner's own Contacts only (L2-122); none while Contacts
/// is off for the platform.
/// </summary>
public static class BirthdayReminders
{
    public static async Task<IReadOnlyList<BirthdayReminderDto>> OfAsync(
        IAppDbContext db, IPhotoStore photos, ContactsSwitch contacts, Guid owner, string? zone, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!contacts.On)
        {
            return [];
        }

        var today = DateOnly.FromDateTime(ReminderRules.LocalNow(zone, now).DateTime);
        var rows = await db.KeyDates.AsNoTracking()
            .Where(d => d.OwnerId == owner && d.Kind == KeyDateKind.Birthday)
            .Join(db.Contacts.Where(c => c.OwnerId == owner), d => d.ContactId, c => c.Id, (d, c) => new { Date = d, Contact = c })
            .ToListAsync(cancellationToken);
        return rows
            .Select(x => (x.Date, x.Contact, Next: x.Date.NextOccurrence(today)))
            .Where(x => x.Next is not null)
            .OrderBy(x => x.Next)
            .ThenBy(x => x.Contact.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(x => new BirthdayReminderDto(
                x.Date.Id,
                x.Contact.Id,
                x.Contact.Name,
                x.Contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                PersonName.Initials(x.Contact.Name),
                AvatarAccent.For(x.Contact.Id),
                x.Next!.Value,
                x.Date.YearsOn(x.Next.Value),
                x.Next.Value.DayNumber - today.DayNumber,
                x.Date.Lead,
                x.Date.RemindersOn))
            .ToList();
    }
}
