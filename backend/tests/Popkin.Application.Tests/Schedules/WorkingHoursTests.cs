using Popkin.Domain;

namespace Popkin.Application.Tests.Schedules;

/// <summary>
/// A day of working hours: up to two stretches, each on the quarter hour, its end after its start,
/// and the two apart (L2-074 AC8).
/// </summary>
public sealed class WorkingHoursTests
{
    [Theory]
    [InlineData("", true)] // not working
    [InlineData("09:00-17:30", true)]
    [InlineData("00:00-24:00", true)] // the whole day
    [InlineData("06:00-10:00+18:00-24:00", true)] // two stretches
    [InlineData("06:00-10:00+10:00-14:00", true)] // the second starts as the first ends
    [InlineData("09:10-17:00", false)] // not on the quarter hour
    [InlineData("09:00-17:20", false)]
    [InlineData("17:00-09:00", false)] // ends before it starts
    [InlineData("09:00-09:00", false)] // ends as it starts
    [InlineData("06:00-10:00+09:00-14:00", false)] // the two overlap
    [InlineData("18:00-24:00+06:00-10:00", false)] // the second before the first
    [InlineData("06:00-08:00+09:00-10:00+11:00-12:00", false)] // three
    public void A_day_is_up_to_two_stretches_on_the_quarter_hour_one_after_the_other(string day, bool valid) =>
        Assert.Equal(valid, WorkingHours.IsValid(StretchesOf(day)));

    [Theory]
    [InlineData("09:00", 540)]
    [InlineData("00:00", 0)]
    [InlineData("24:00", 1440)]
    [InlineData("17:45", 1065)]
    public void A_time_is_read_as_minutes_from_midnight(string time, int minutes) =>
        Assert.Equal(minutes, WorkingHours.MinutesOf(time));

    [Theory]
    [InlineData("9:00")]
    [InlineData("24:15")]
    [InlineData("12:60")]
    [InlineData("noon")]
    [InlineData("")]
    public void A_time_that_is_not_HH_mm_of_a_day_is_not_read(string time) =>
        Assert.Null(WorkingHours.MinutesOf(time));

    private static List<Stretch> StretchesOf(string day) =>
        day.Length == 0
            ? []
            : day.Split('+').Select(stretch =>
            {
                var times = stretch.Split('-');
                return new Stretch(WorkingHours.MinutesOf(times[0])!.Value, WorkingHours.MinutesOf(times[1])!.Value);
            }).ToList();
}
