// Traces to: L2-140 AC1, L2-133 AC2, L2-145 AC4, known gaps 104 and 114 (ruled)
// Description: The words of each reminder and when a day reads as a weekday or a date, one case per row of the design's rulings; 9 am in the person's zone.
using Popkin.Application.Contacts.Reminders;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

public sealed class ReminderRulesTests
{
    private static DateOnly D(string day) => DateOnly.Parse(day, System.Globalization.CultureInfo.InvariantCulture);

    // Days ahead | When
    [Theory]
    [InlineData("2026-09-15", "today")]
    [InlineData("2026-09-16", "tomorrow")]
    [InlineData("2026-09-19", "on Saturday")]
    [InlineData("2026-09-21", "on Monday")]
    [InlineData("2026-09-22", "on 22 September")]
    [InlineData("2026-10-15", "on 15 October")]
    public void When_reads_a_weekday_within_six_days_and_a_date_after(string occursOn, string when) =>
        Assert.Equal(when, ReminderRules.When(D(occursOn), D("2026-09-15")));

    // Kind | Title | Year | What
    [Theory]
    [InlineData(KeyDateKind.Birthday, null, 1993, "Grace turns 33")]
    [InlineData(KeyDateKind.Birthday, null, null, "Grace’s birthday")]
    [InlineData(KeyDateKind.Anniversary, null, 2021, "Grace’s anniversary")]
    [InlineData(KeyDateKind.Milestone, "Iris is one month old", null, "Iris is one month old")]
    [InlineData(KeyDateKind.Other, null, null, "Grace’s day")]
    public void What_a_date_is(KeyDateKind kind, string? title, int? year, string what)
    {
        var date = KeyDate.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), kind, title, 9, 19, year, true, ReminderLead.OneWeekBefore, DateTimeOffset.UnixEpoch);

        Assert.Equal(what, ReminderRules.What(date, "Grace", D("2026-09-19")));
    }

    [Fact]
    public void A_date_reads_what_and_when() =>
        Assert.Equal(
            "Grace turns 33 on Saturday",
            ReminderRules.DateWords(
                KeyDate.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), KeyDateKind.Birthday, null, 9, 19, 1993, true, ReminderLead.OneWeekBefore, DateTimeOffset.UnixEpoch),
                "Grace", D("2026-09-19"), D("2026-09-15")));

    [Fact]
    public void A_follow_up_and_a_habit_read_their_day()
    {
        Assert.Equal("Return Ruth’s ladder is due today", ReminderRules.FollowUpWords("Return Ruth’s ladder"));
        Assert.Equal("Lunch with Chidi is due today", ReminderRules.HabitWords("Lunch", "Chidi", overdue: false));
        Assert.Equal("Lunch with Chidi is overdue", ReminderRules.HabitWords("Lunch", "Chidi", overdue: true));
    }

    // Zone | UTC now | Local day | From 8 am (L2-162 AC1)
    [Theory]
    [InlineData(null, "2026-09-15T07:59:00Z", "2026-09-15", false)]
    [InlineData(null, "2026-09-15T08:00:00Z", "2026-09-15", true)]
    [InlineData("Europe/London", "2026-09-15T07:00:00Z", "2026-09-15", true)]
    [InlineData("America/Los_Angeles", "2026-09-15T08:00:00Z", "2026-09-15", false)]
    [InlineData("America/Los_Angeles", "2026-09-15T15:00:00Z", "2026-09-15", true)]
    [InlineData("Asia/Tokyo", "2026-09-15T22:59:00Z", "2026-09-16", false)]
    [InlineData("Not/AZone", "2026-09-15T08:00:00Z", "2026-09-15", true)]
    public void Eight_am_is_where_the_person_is(string? zone, string utc, string day, bool due)
    {
        var local = ReminderRules.LocalNow(zone, DateTimeOffset.Parse(utc, System.Globalization.CultureInfo.InvariantCulture));

        Assert.Equal(D(day), DateOnly.FromDateTime(local.DateTime));
        Assert.Equal(due, ReminderRules.IsTime(local));
    }
}
