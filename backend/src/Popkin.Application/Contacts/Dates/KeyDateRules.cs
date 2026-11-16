using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Dates;

/// <summary>What a key date must be (L2-138 AC2), and how one is loaded for its owner alone (L2-122).</summary>
public static class KeyDateRules
{
    public static ProblemException NotFound() => new(404, "key_date_not_found", "This date isn't in your Contacts.");

    public static KeyDateKind Kind(string? kind) =>
        Enum.TryParse<KeyDateKind>(kind, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw ProblemException.Invalid("kind_not_allowed", "Choose what kind of day it is.", "kind");

    public static ReminderLead Lead(string? lead, string field = "lead") =>
        Enum.TryParse<ReminderLead>(lead, ignoreCase: false, out var parsed) && Enum.IsDefined(parsed)
            ? parsed
            : throw ProblemException.Invalid("lead_not_allowed", "Choose when to be reminded.", field);

    /// <summary>A real day; a one-off date needs its year; a title fits (known gap 103, ruled at 80).</summary>
    public static (int Month, int Day) Day(AddKeyDateRequest request)
    {
        if (request.Month is not { } month || request.Day is not { } day || (!request.EveryYear && request.Year is null))
        {
            throw ProblemException.Invalid("day_required", "Add the day.", "day");
        }

        if (!KeyDate.IsDay(month, day, request.Year))
        {
            throw ProblemException.Invalid("day_not_valid", "That day isn't in the calendar.", "day");
        }

        if (request.Title?.Trim().Length > KeyDate.MaxTitleLength)
        {
            throw ProblemException.Invalid("title_too_long", $"Keep it to {KeyDate.MaxTitleLength} characters.", "title");
        }

        return (month, day);
    }

    public static async Task<KeyDate> RequireOwnedAsync(IAppDbContext db, Guid ownerId, Guid keyDateId, CancellationToken cancellationToken) =>
        await db.KeyDates.OwnedBy(ownerId).FirstOrDefaultAsync(d => d.Id == keyDateId, cancellationToken) ?? throw NotFound();

    public static async Task<ReminderPreferences> PreferencesAsync(IAppDbContext db, Guid ownerId, CancellationToken cancellationToken) =>
        await db.ReminderPreferences.OwnedBy(ownerId).AsNoTracking().FirstOrDefaultAsync(cancellationToken)
        ?? ReminderPreferences.Defaults(ownerId);

    /// <summary>A profile's key dates, soonest first, then those passed.</summary>
    public static IReadOnlyList<ContactKeyDateDto> ForProfile(IEnumerable<KeyDate> dates, DateOnly today) =>
        dates
            .Select(d => (Date: d, Next: d.NextOccurrence(today)))
            .OrderBy(x => x.Next is null)
            .ThenBy(x => x.Next)
            .Select(x => new ContactKeyDateDto(
                x.Date.Id, x.Date.Kind, x.Date.Title, x.Date.Month, x.Date.Day, x.Date.Year, x.Date.EveryYear, x.Date.Lead,
                x.Next, x.Next is { } next ? next.DayNumber - today.DayNumber : null))
            .ToList();

    /// <summary>A date as Dates lists it, on its occurrence `next`.</summary>
    public static KeyDateRowDto Row(KeyDate date, Contact contact, DateOnly next, DateOnly today, IPhotoStore photos) =>
        new(
            date.Id,
            contact.Id,
            PersonName.FirstName(contact.Name),
            contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
            PersonName.Initials(contact.Name),
            AvatarAccent.For(contact.Id),
            date.Kind,
            date.Title,
            next,
            next.DayNumber - today.DayNumber,
            date.YearsOn(next),
            date.Lead);

    /// <summary>A date as Add a date answers it: its next occurrence, or its one day once passed.</summary>
    public static KeyDateRowDto Row(KeyDate date, Contact contact, DateOnly today, IPhotoStore photos)
    {
        var year = date.Year ?? today.Year;
        var next = date.NextOccurrence(today) ?? new DateOnly(year, date.Month, Math.Min(date.Day, DateTime.DaysInMonth(year, date.Month)));
        return Row(date, contact, next, today, photos);
    }
}
