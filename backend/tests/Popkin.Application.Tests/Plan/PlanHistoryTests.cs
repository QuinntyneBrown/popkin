using Popkin.Domain;

namespace Popkin.Application.Tests.Plan;

/// <summary>
/// The points left at the end of each day of a sprint, from its changes (L2-070 AC5, AC6), and
/// how far behind the ideal line the plan is (L2-068 AC7, L2-071 AC2).
/// </summary>
public sealed class PlanHistoryTests
{
    private static readonly DateOnly FirstDay = new(2026, 8, 30);

    // The changes as "day:hour:delta" from the first day, split on ','; the day whose end is read.
    [Theory]
    [InlineData("", 0, 0)] // nothing yet
    [InlineData("0:9:5", 0, 5)] // a story into To do on the first day
    [InlineData("0:9:5,0:18:3", 0, 8)] // two the same day
    [InlineData("0:9:5,1:9:-5", 0, 5)] // done the next day: the first day still counts it
    [InlineData("0:9:5,1:9:-5", 1, 0)] // and the day it is done does not (AC5)
    [InlineData("0:9:5,1:9:-5,2:9:5", 2, 5)] // moved out of Done: back again (AC5)
    [InlineData("0:9:5,3:23:3", 3, 8)] // its points raised late in the day: the day rises (AC6)
    [InlineData("0:9:5,3:23:-2", 3, 3)] // and lowered (AC6)
    [InlineData("0:9:5,4:0:-5", 3, 5)] // a change at midnight is the next day's
    public void The_points_left_at_the_end_of_a_day_count_every_change_before_its_midnight(
        string changes, int day, int pointsLeft) =>
        Assert.Equal(pointsLeft, History(changes).PointsLeftAtEndOf(FirstDay.AddDays(day)));

    // The days run from the first day to today, or to the last day once it has passed.
    [Theory]
    [InlineData(0, "5")]
    [InlineData(3, "5,5,0,3")]
    [InlineData(40, "5,5,0,3" + ",3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3")]
    public void The_days_run_from_the_first_day_to_today_or_the_last_day(int today, string pointsLeft)
    {
        var days = History("0:9:5,2:9:-5,3:9:3").Days(FirstDay.AddDays(today));

        Assert.Equal(pointsLeft, string.Join(',', days.Select(d => d.PointsLeft)));
        Assert.Equal(FirstDay, days[0].Day);
        Assert.Equal(Math.Min(today, Sprint.LastDayOffset) + 1, days.Count);
    }

    // round(start × (27 − i) / 27), half away from zero, and 0 after the last day.
    [Theory]
    [InlineData(32, 0, 32)]
    [InlineData(32, 13, 17)] // the mocks' fourteenth day: 16.59
    [InlineData(32, 27, 0)] // the last day
    [InlineData(32, 30, 0)] // after it
    [InlineData(27, 13, 14)] // exactly 14
    [InlineData(1, 13, 1)] // 0.52 rounds up
    [InlineData(1, 14, 0)] // 0.48 rounds down
    [InlineData(2, 13, 1)] // 1.04
    [InlineData(54, 13, 28)] // 28.0
    [InlineData(0, 5, 0)] // nothing in the sprint
    public void The_ideal_line_burns_evenly_from_the_start_to_0_on_the_last_day(int start, int day, int ideal) =>
        Assert.Equal(ideal, PlanHistory.Ideal(start, day));

    // Behind: the points left now minus the ideal for today; ahead when below it (L2-068 AC7).
    [Theory]
    [InlineData("0:9:32,13:9:-8", 13, 7)] // the mocks: 24 left against 17
    [InlineData("0:9:32,13:9:-18", 13, -3)] // 14 left: 3 ahead
    [InlineData("0:9:32,13:9:-15", 13, 0)] // on track
    [InlineData("0:9:32", 30, 32)] // after the last day, the ideal is 0
    [InlineData("0:9:4,1:9:28", 1, 28)] // the start is the first day's end: 32 left against 4
    public void Behind_is_the_points_left_now_minus_the_ideal_for_today(string changes, int today, int behind) =>
        Assert.Equal(behind, History(changes).Behind(FirstDay.AddDays(today)));

    [Fact]
    public void The_start_points_are_the_points_left_at_the_end_of_the_first_day() =>
        Assert.Equal(8, History("0:9:5,0:20:3,1:9:13").StartPoints);

    private static PlanHistory History(string changes) =>
        new(
            FirstDay,
            changes.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(c => c.Split(':'))
                .Select(p => (
                    new DateTimeOffset(FirstDay.AddDays(int.Parse(p[0])), TimeOnly.MinValue, TimeSpan.Zero).AddHours(int.Parse(p[1])),
                    int.Parse(p[2])))
                .ToList());
}
