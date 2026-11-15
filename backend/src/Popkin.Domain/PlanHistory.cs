namespace Popkin.Domain;

/// <summary>The points left at the end of one day of a sprint.</summary>
public sealed record PlanDay(DateOnly Day, int PointsLeft);

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

    /// <summary>The points left by today's end minus the ideal for today: above 0 behind, below it ahead.</summary>
    public int Behind(DateOnly today) =>
        PointsLeftAtEndOf(today) - Ideal(StartPoints, today.DayNumber - FirstDay.DayNumber);
}
