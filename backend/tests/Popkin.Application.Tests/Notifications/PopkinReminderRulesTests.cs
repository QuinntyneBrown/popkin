using System.Globalization;
using Popkin.Application.Notifications.Emails;
using Popkin.Application.Notifications.Reminders;

namespace Popkin.Application.Tests.Notifications;

/// <summary>PopkinReminderRules and the wrap-up time, one case per row (send-reminders, L2-162, L2-167).</summary>
public sealed class PopkinReminderRulesTests
{
    private static DateTimeOffset Utc(string at) => DateTimeOffset.Parse(at, CultureInfo.InvariantCulture);

    // Zone | due on | reminds from (UTC) | until (UTC)
    [Theory]
    [InlineData("UTC", "2026-09-18", "2026-09-17T18:00:00Z", "2026-09-18T00:00:00Z")]
    [InlineData("Europe/London", "2026-09-18", "2026-09-17T17:00:00Z", "2026-09-17T23:00:00Z")]
    [InlineData("Europe/London", "2026-10-26", "2026-10-25T18:00:00Z", "2026-10-26T00:00:00Z")]
    [InlineData("Europe/London", "2027-03-29", "2027-03-28T17:00:00Z", "2027-03-28T23:00:00Z")]
    [InlineData("Pacific/Auckland", "2026-09-18", "2026-09-17T06:00:00Z", "2026-09-17T12:00:00Z")]
    public void A_story_reminds_from_six_the_evening_before_where_its_owner_is(string zone, string dueOn, string from, string until)
    {
        var window = PopkinReminderRules.StoryDueWindow(DateOnly.Parse(dueOn, CultureInfo.InvariantCulture), TimeZoneInfo.FindSystemTimeZoneById(zone));

        Assert.Equal((Utc(from), Utc(until)), window);
    }

    // Length | created | ends | window (L2-162 AC1, AC3; "A short Popkin")
    [Theory]
    [InlineData("Just today, started that morning", "2026-09-18T08:00:00Z", "2026-09-18T23:59:00Z", null)]
    [InlineData("The weekend, started on Saturday evening", "2026-09-19T19:00:00Z", "2026-09-20T18:00:00Z", null)]
    [InlineData("The weekend, started on Saturday morning", "2026-09-19T10:00:00Z", "2026-09-20T18:00:00Z", "2026-09-19T18:00:00Z")]
    [InlineData("The weekend, started on Friday", "2026-09-18T12:00:00Z", "2026-09-20T18:00:00Z", "2026-09-19T18:00:00Z")]
    [InlineData("Until a date, a week out", "2026-09-11T12:00:00Z", "2026-09-18T18:00:00Z", "2026-09-17T18:00:00Z")]
    [InlineData("Given more time", "2026-09-11T12:00:00Z", "2026-09-25T18:00:00Z", "2026-09-24T18:00:00Z")]
    [InlineData("Exactly a day long", "2026-09-17T18:00:00Z", "2026-09-18T18:00:00Z", "2026-09-17T18:00:00Z")]
    public void A_Popkin_reminds_in_its_last_24_hours_unless_it_began_inside_them(string row, string created, string ends, string? from)
    {
        var window = PopkinReminderRules.WrapUpWindow(Utc(ends), Utc(created));

        Assert.True(from is null ? window is null : window == (Utc(from), Utc(ends)), $"{row}: {window}");
    }

    [Fact]
    public void A_Popkin_that_keeps_going_never_reminds() =>
        Assert.Null(PopkinReminderRules.WrapUpWindow(null, Utc("2026-09-11T12:00:00Z")));

    // The end, where the person is, as the headline and the alert write it.
    [Theory]
    [InlineData("2026-09-20T18:00:00Z", "UTC", "6 pm")]
    [InlineData("2026-09-20T18:30:00Z", "UTC", "6:30 pm")]
    [InlineData("2026-09-20T17:00:00Z", "Europe/London", "6 pm")]
    [InlineData("2026-09-20T00:00:00Z", "UTC", "12 am")]
    [InlineData("2026-09-20T12:05:00Z", "UTC", "12:05 pm")]
    public void The_end_reads_in_the_persons_own_hours(string at, string zone, string words) =>
        Assert.Equal(words, WrapUpEmailComposer.Time(Utc(at), TimeZoneInfo.FindSystemTimeZoneById(zone)));
}
