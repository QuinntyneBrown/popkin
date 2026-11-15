using Popkin.Domain;

namespace Popkin.Application.Tests.Plan;

/// <summary>
/// When the plan finishes at the pace of the last five days (L2-071 AC3): late, early, on the
/// last day, no progress, or done. One case per row of the burn-down design's table.
/// </summary>
public sealed class PlanForecastTests
{
    private static readonly DateOnly FirstDay = new(2026, 8, 30);

    // The points left at the end of each day from the first, split on ','; today, from the first
    // day; then what the forecast answers, its date as days from the first day.
    [Theory]
    // the mocks: 31 left at the end of Sep 7 and 24 now, 1.4 a day, 18 days: Sep 30, 4 late
    [InlineData("32,32,32,29,29,28,28,28,31,29,29,27,26,24", 13, ForecastKind.Late, 31, 4)]
    [InlineData("20,18,16,14,12,10", 5, ForecastKind.Early, 10, 17)] // 2 a day: 5 more days
    [InlineData("27,26,25,24,23,22", 5, ForecastKind.LastDay, 27, 0)] // 22 more days at 1
    [InlineData("10,8,6", 2, ForecastKind.Early, 5, 22)] // a window of two days, not five
    [InlineData("10,9,8,7,6,5,4", 6, ForecastKind.Early, 10, 17)] // 9 to 4 over five days: 1 a day, 4 more days
    [InlineData("10", 0, ForecastKind.NoProgress, null, 0)] // the first day: no window yet
    [InlineData("10,8,10", 2, ForecastKind.NoProgress, null, 0)] // back where it was
    [InlineData("10,10,10,12,12,12", 5, ForecastKind.NoProgress, null, 0)] // it rose
    [InlineData("10,5,0,0", 3, ForecastKind.Done, 2, 25)] // 0 since Sep 1
    [InlineData("10,0,5,0", 3, ForecastKind.Done, 3, 24)] // 0 again only since Sep 2
    public void The_forecast_finishes_the_points_left_at_the_pace_of_the_last_five_days(
        string pointsLeft, int today, ForecastKind kind, int? date, int days)
    {
        var forecast = History(pointsLeft).Forecast(FirstDay.AddDays(today));

        Assert.Equal(new Forecast(kind, date is { } d ? FirstDay.AddDays(d) : null, days), forecast);
    }

    // Done after the last day reads late, by a negative count of days early.
    [Fact]
    public void A_plan_finished_after_the_last_day_is_late()
    {
        var history = new PlanHistory(FirstDay, [(At(0), 10), (At(29), -10)]);

        Assert.Equal(new Forecast(ForecastKind.Done, FirstDay.AddDays(29), -2), history.Forecast(FirstDay.AddDays(30)));
    }

    private static DateTimeOffset At(int day) => new DateTimeOffset(FirstDay.AddDays(day), TimeOnly.MinValue, TimeSpan.Zero).AddHours(9);

    private static PlanHistory History(string pointsLeft)
    {
        var ends = pointsLeft.Split(',').Select(int.Parse).ToList();
        return new PlanHistory(
            FirstDay,
            ends.Select((points, day) => (At(day), points - (day == 0 ? 0 : ends[day - 1]))).ToList());
    }
}
