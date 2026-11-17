// Traces to: L2-125 AC2, AC3, AC7, known gaps 99 and 111 (ruled)
// Description: Today's cuts, one case per row of the design's rulings: the next date and Coming up, drifting, and "Last time:".
using Popkin.Application.Contacts.Today;

namespace Popkin.Application.Tests.Contacts;

public sealed class TodayRulesTests
{
    // Days left of every date | Next | Coming up
    [Theory]
    [InlineData(new int[0], null, new string[0])]
    [InlineData(new[] { 4 }, "4", new string[0])]
    [InlineData(new[] { 11, 0, 4 }, "0", new[] { "4", "11" })]
    [InlineData(new[] { 4, 11, 22, 39, 45, 50 }, "4", new[] { "11", "22", "39", "45" })]
    [InlineData(new[] { 4, 60, 61 }, "4", new[] { "60" })]
    [InlineData(new[] { 200, 300 }, "200", new string[0])]
    public void The_next_date_leads_and_Coming_up_is_cut(int[] daysLeft, string? next, string[] comingUp)
    {
        var (lead, rest) = TodayRules.Dates(daysLeft.Select(d => (d.ToString(), d)));

        Assert.Equal(next, lead);
        Assert.Equal(comingUp, rest);
    }

    // Last talked (days before) | Drifting
    [Theory]
    [InlineData(null, false)]
    [InlineData(10, false)]
    [InlineData(30, false)]
    [InlineData(31, true)]
    [InlineData(59, true)]
    public void Drifting_after_30_days(int? daysAgo, bool drifting)
    {
        var today = new DateOnly(2026, 9, 15);

        Assert.Equal(drifting, TodayRules.IsDrifting(daysAgo is { } d ? today.AddDays(-d) : null, today));
    }

    // Note | Last time
    [Theory]
    [InlineData(null, null)]
    [InlineData("  ", null)]
    [InlineData("Venue’s booked. She asked if I’d do a reading.", "Venue’s booked.")]
    [InlineData("Said yes!  Wants Mary Oliver.", "Said yes!")]
    [InlineData("No full stop here", "No full stop here")]
    public void Last_time_is_the_first_sentence(string? note, string? lastTime) =>
        Assert.Equal(lastTime, TodayRules.LastTime(note));
}
