using System.Globalization;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Reminders;

/// <summary>
/// What a reminder says and when it is due (docs/detailed-designs/contacts/reminders, known gaps
/// 104 and 114 ruled): 9 am where the person is, a weekday within the next 6 days and a date after.
/// </summary>
public static class ReminderRules
{
    /// <summary>The hour, where the person is, from which the day's reminders go.</summary>
    public const int Hour = 9;

    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");

    /// <summary>"today", "tomorrow", "on Saturday", or "on 22 September".</summary>
    public static string When(DateOnly occursOn, DateOnly today)
    {
        var days = occursOn.DayNumber - today.DayNumber;
        return days switch
        {
            0 => "today",
            1 => "tomorrow",
            <= 6 => $"on {occursOn.DayOfWeek}",
            _ => $"on {occursOn.Day} {occursOn.ToString("MMMM", English)}",
        };
    }

    /// <summary>"Grace turns 33", "Grace’s birthday", "Grace’s anniversary", or the date's own title.</summary>
    public static string What(KeyDate date, string firstName, DateOnly occursOn) => date.Kind switch
    {
        KeyDateKind.Birthday when date.YearsOn(occursOn) is { } years => $"{firstName} turns {years}",
        KeyDateKind.Birthday => $"{firstName}’s birthday",
        KeyDateKind.Anniversary => $"{firstName}’s anniversary",
        _ => date.Title ?? $"{firstName}’s day",
    };

    /// <summary>"Grace turns 33 on Saturday".</summary>
    public static string DateWords(KeyDate date, string firstName, DateOnly occursOn, DateOnly today) =>
        $"{What(date, firstName, occursOn)} {When(occursOn, today)}";

    /// <summary>"Return Ruth’s ladder is due today": a follow-up, or a promise's "Remind me {day}".</summary>
    public static string FollowUpWords(string text) => $"{text} is due today";

    /// <summary>"Lunch with Chidi is due today", and the day after, "… is overdue".</summary>
    public static string HabitWords(string what, string firstName, bool overdue) =>
        $"{what} with {firstName} is {(overdue ? "overdue" : "due today")}";

    /// <summary>Now where the person is; UTC before a zone is known, or for one the server does not know.</summary>
    public static DateTimeOffset LocalNow(string? zone, DateTimeOffset utcNow) =>
        TryZone(zone) is { } found ? TimeZoneInfo.ConvertTime(utcNow, found) : utcNow.ToUniversalTime();

    public static bool IsTime(DateTimeOffset localNow) => localNow.Hour >= Hour;

    public static TimeZoneInfo? TryZone(string? zone)
    {
        if (string.IsNullOrWhiteSpace(zone))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(zone);
        }
        catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return null;
        }
    }
}
