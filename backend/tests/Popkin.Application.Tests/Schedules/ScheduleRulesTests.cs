using Popkin.Domain;

namespace Popkin.Application.Tests.Schedules;

/// <summary>The weeks of Schedules: a week runs Monday to Sunday (L2-072 AC2).</summary>
public sealed class ScheduleRulesTests
{
    [Theory]
    [InlineData("2027-02-15", "2027-02-15")] // a Monday is its own week
    [InlineData("2027-02-17", "2027-02-15")] // Wednesday
    [InlineData("2027-02-20", "2027-02-15")] // Saturday
    [InlineData("2027-02-21", "2027-02-15")] // Sunday ends the week
    [InlineData("2027-02-22", "2027-02-22")] // the next Monday starts the next
    [InlineData("2027-03-03", "2027-03-01")] // across a month
    [InlineData("2027-01-01", "2026-12-28")] // across a year
    public void Any_day_belongs_to_the_week_of_its_Monday(string day, string monday) =>
        Assert.Equal(DateOnly.Parse(monday), ScheduleRules.MondayOf(DateOnly.Parse(day)));

    [Theory]
    [InlineData("2027-02-15", "2027-02-17", true)] // this week
    [InlineData("2026-01-05", "2027-02-17", true)] // a week gone by
    [InlineData("2028-02-14", "2027-02-17", true)] // 362 days ahead
    [InlineData("2028-02-17", "2027-02-17", true)] // exactly a year: 365 days
    [InlineData("2028-02-21", "2027-02-17", false)] // 369 days ahead
    public void Time_off_is_entered_up_to_a_year_ahead(string monday, string today, bool within) =>
        Assert.Equal(within, ScheduleRules.IsWithinAYear(DateOnly.Parse(monday), DateOnly.Parse(today)));
}
