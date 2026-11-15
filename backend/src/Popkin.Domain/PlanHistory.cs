namespace Popkin.Domain;

/// <summary>The points left at the end of one day of a sprint.</summary>
public sealed record PlanDay(DateOnly Day, int PointsLeft);

/// <summary>How the forecast reads (L2-071 AC3).</summary>
public enum ForecastKind
{
    Late,
    Early,
    LastDay,
    NoProgress,
    Done,
}

/// <summary>
/// When the plan finishes: its <see cref="Date"/> (none for no progress) and its
/// <see cref="Days"/> from the last day: late or early by them, 0 on it. A plan done after the
/// last day is done with fewer than 0 days early.
/// </summary>
public sealed record Forecast(ForecastKind Kind, DateOnly? Date, int Days);

/// <summary>
/// A sprint's points left over time, from its changes (L2-070 AC5, AC6): the points left at the
/// end of each day, the start points, the ideal line and how far behind it the plan is
/// (L2-068 AC7, L2-071 AC2). A day is a calendar day in UTC.
/// </summary>
public sealed class PlanHistory(DateOnly firstDay, IReadOnlyList<(DateTimeOffset At, int Delta)> changes)
{
    public DateOnly FirstDay { get; } = firstDay;

    public DateOnly LastDay => FirstDay.AddDays(Sprint.LastDayOffset);

    /// <summary>The points left at the end of the sprint's first day.</summary>
    public int StartPoints => PointsLeftAtEndOf(FirstDay);

    /// <summary>The sum of every change made before the next day's midnight UTC.</summary>
    public int PointsLeftAtEndOf(DateOnly day)
    {
        var midnight = new DateTimeOffset(day.AddDays(1), TimeOnly.MinValue, TimeSpan.Zero);
        return changes.Where(c => c.At < midnight).Sum(c => c.Delta);
    }

    /// <summary>One day for each from the first day to today, or to the last day once it has passed.</summary>
    public IReadOnlyList<PlanDay> Days(DateOnly today)
    {
        var last = today < LastDay ? today : LastDay;
        var count = Math.Max(0, last.DayNumber - FirstDay.DayNumber) + 1;
        return Enumerable.Range(0, count)
            .Select(i => FirstDay.AddDays(i))
            .Select(day => new PlanDay(day, PointsLeftAtEndOf(day)))
            .ToList();
    }

    /// <summary>
    /// The points left on day <paramref name="day"/> (0 the first) had the plan burned evenly
    /// from <paramref name="start"/> to 0 on the last day: round(start × (27 − day) / 27), half
    /// away from zero; 0 after the last day.
    /// </summary>
    public static int Ideal(int start, int day) =>
        day >= Sprint.LastDayOffset
            ? 0
            : (int)Math.Round(start * (Sprint.LastDayOffset - day) / (double)Sprint.LastDayOffset, MidpointRounding.AwayFromZero);

    /// <summary>The days of the pace's window: the five before today, fewer in a younger sprint.</summary>
    public const int PaceDays = 5;

    /// <summary>
    /// When the plan finishes at the pace of the last five days (L2-071 AC3): done once no points
    /// are left, from the first day since which none have been; otherwise the points left at the
    /// average burned per day over the window, or no progress when none were.
    /// </summary>
    public Forecast Forecast(DateOnly today)
    {
        var left = PointsLeftAtEndOf(today);
        if (left <= 0)
        {
            var done = today;
            while (done > FirstDay && PointsLeftAtEndOf(done.AddDays(-1)) <= 0)
            {
                done = done.AddDays(-1);
            }

            return new Forecast(ForecastKind.Done, done, LastDay.DayNumber - done.DayNumber);
        }

        var window = Math.Min(PaceDays, today.DayNumber - FirstDay.DayNumber);
        var burned = window <= 0 ? 0 : PointsLeftAtEndOf(today.AddDays(-window)) - left;
        if (burned <= 0)
        {
            return new Forecast(ForecastKind.NoProgress, null, 0);
        }

        // ceil(left / (burned / window)), in whole numbers.
        var finish = today.AddDays((left * window + burned - 1) / burned);
        return finish.CompareTo(LastDay) switch
        {
            > 0 => new Forecast(ForecastKind.Late, finish, finish.DayNumber - LastDay.DayNumber),
            < 0 => new Forecast(ForecastKind.Early, finish, LastDay.DayNumber - finish.DayNumber),
            _ => new Forecast(ForecastKind.LastDay, finish, 0),
        };
    }

    /// <summary>The points left by today's end minus the ideal for today: above 0 behind, below it ahead.</summary>
    public int Behind(DateOnly today) =>
        PointsLeftAtEndOf(today) - Ideal(StartPoints, today.DayNumber - FirstDay.DayNumber);
}
