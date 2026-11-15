namespace Popkin.Domain;

/// <summary>The weeks of Schedules (L1-018): a week runs Monday to Sunday.</summary>
public static class ScheduleRules
{
    public const int DaysInAWeek = 7;

    /// <summary>The Monday of the week that holds the day.</summary>
    public static DateOnly MondayOf(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));

    /// <summary>How far ahead time off and working hours may be entered (L2-073 AC5).</summary>
    public const int DaysAhead = 365;

    /// <summary>Whether a week's Monday is at most a year after today.</summary>
    public static bool IsWithinAYear(DateOnly monday, DateOnly today) => monday <= today.AddDays(DaysAhead);
}
