namespace Popkin.Domain;

/// <summary>
/// What every member gets until they choose, set by an Owner (L2-173): how often activity email
/// comes, the bundling window, the daily most, quiet hours, and how early a new birthday reminds
/// (null for "Off").
/// </summary>
public sealed record NotificationDefaults(
    NotificationFrequency ActivityEmail,
    int BundleMinutes,
    int MostEmailsPerDay,
    TimeOnly QuietFrom,
    TimeOnly QuietTo,
    ReminderLead? BirthdayLead)
{
    /// <summary>The first values of L2-161 and L2-173 AC2.</summary>
    public static NotificationDefaults First { get; } = new(
        NotificationFrequency.AsItHappens, 10, 12, new TimeOnly(21, 0), new TimeOnly(8, 0), ReminderLead.OneWeekBefore);
}

/// <summary>Each default's range (docs/detailed-designs/admin-platform/notification-defaults).</summary>
public static class NotificationDefaultsRules
{
    /// <summary>The leads a default may take, besides "Off" (L2-173 AC2).</summary>
    public static IReadOnlyList<ReminderLead> BirthdayLeads { get; } =
        [ReminderLead.OnTheDay, ReminderLead.OneDayBefore, ReminderLead.ThreeDaysBefore, ReminderLead.OneWeekBefore];

    /// <summary>The first value outside its range, as the field and what to enter; null when all are allowed.</summary>
    public static (string Field, string Message)? Check(NotificationDefaults defaults) =>
        defaults.BundleMinutes is < 1 or > 60 ? ("bundleMinutes", "Enter a whole number from 1 to 60.")
        : defaults.MostEmailsPerDay is < 1 or > 100 ? ("mostEmailsPerDay", "Enter a whole number from 1 to 100.")
        : !OnTheHalfHour(defaults.QuietFrom) ? ("quietFrom", TimeMessage)
        : !OnTheHalfHour(defaults.QuietTo) ? ("quietTo", TimeMessage)
        : defaults.QuietFrom == defaults.QuietTo ? ("quietTo", "Quiet hours can’t start and end at the same time.")
        : defaults.BirthdayLead is { } lead && !BirthdayLeads.Contains(lead) ? ("birthdayLead", "Choose Off, On the day, 1 day before, 3 days before or 1 week before.")
        : null;

    private const string TimeMessage = "Enter a time on the hour or half hour, such as 21:00.";

    private static bool OnTheHalfHour(TimeOnly time) => time.Minute is 0 or 30 && time.Second == 0 && time.Millisecond == 0;
}
