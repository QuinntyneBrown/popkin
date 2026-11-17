using Popkin.Domain;

namespace Popkin.Application.Contacts.Dates;

/// <summary>One key date on Dates (L2-137 AC1): its next occurrence, the days left and the age or years.</summary>
public sealed record KeyDateRowDto(
    Guid Id,
    Guid ContactId,
    string FirstName,
    string? PhotoUrl,
    string Initials,
    PopkinColour Accent,
    KeyDateKind Kind,
    string? Title,
    DateOnly OccursOn,
    int DaysLeft,
    int? Years,
    ReminderLead Lead);

/// <summary>A key date as a profile shows it (L2-128 AC2); `nextOn` is null once a one-off date has passed.</summary>
public sealed record ContactKeyDateDto(
    Guid Id,
    KeyDateKind Kind,
    string? Title,
    int Month,
    int Day,
    int? Year,
    bool EveryYear,
    ReminderLead Reminder,
    DateOnly? NextOn,
    int? DaysLeft);

/// <summary>
/// The owner's default lead time per kind (L2-139). How reminders reach them is the "Birthdays"
/// kind of Notifications (L2-140, as changed 17 November 2026).
/// </summary>
public sealed record ReminderPreferencesDto(
    ReminderLead BirthdayLead,
    ReminderLead AnniversaryLead,
    ReminderLead MilestoneLead)
{
    public static ReminderPreferencesDto Of(ReminderPreferences p) =>
        new(p.BirthdayLead, p.AnniversaryLead, p.MilestoneLead);
}

public sealed record ContactDatesDto(IReadOnlyList<KeyDateRowDto> Dates, ReminderPreferencesDto Preferences);

/// <summary>Add a date (L2-138): kind and lead are names; a missing lead takes the owner's default for the kind.</summary>
public sealed record AddKeyDateRequest(
    Guid ClientId,
    string? Kind,
    string? Title,
    int? Month,
    int? Day,
    int? Year,
    bool EveryYear,
    string? Lead);

public sealed record ChangeReminderRequest(string? Lead);

public sealed record SaveReminderPreferencesRequest(
    string? BirthdayLead,
    string? AnniversaryLead,
    string? MilestoneLead);
