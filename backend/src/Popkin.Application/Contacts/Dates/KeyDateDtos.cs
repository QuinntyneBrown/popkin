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

/// <summary>The owner's default lead time per kind and how reminders reach them (L2-139, L2-140).</summary>
public sealed record ReminderPreferencesDto(
    ReminderLead BirthdayLead,
    ReminderLead AnniversaryLead,
    ReminderLead MilestoneLead,
    bool PhoneNotifications,
    bool MondayEmail)
{
    public static ReminderPreferencesDto Of(ReminderPreferences p) =>
        new(p.BirthdayLead, p.AnniversaryLead, p.MilestoneLead, p.PhoneNotifications, p.MondayEmail);
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
    string? MilestoneLead,
    bool PhoneNotifications,
    bool MondayEmail);
