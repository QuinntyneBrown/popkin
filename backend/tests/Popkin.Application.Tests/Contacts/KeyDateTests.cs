using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

/// <summary>
/// When a key date next comes round, when its reminder falls and what age or years it marks
/// (L2-137, L2-138; known gaps 103 and 113, ruled).
/// </summary>
public sealed class KeyDateTests
{
    private static readonly DateOnly Today = new(2026, 9, 15);

    private static KeyDate Date(int month, int day, int? year = null, bool everyYear = true, ReminderLead lead = ReminderLead.OneWeekBefore) =>
        KeyDate.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), KeyDateKind.Birthday, null, month, day, year, everyYear, lead, DateTimeOffset.UnixEpoch);

    [Theory]
    // Every year: later this year, today, or already past (next year).
    [InlineData(9, 19, null, true, "2026-09-19")]
    [InlineData(9, 15, null, true, "2026-09-15")]
    [InlineData(1, 24, null, true, "2027-01-24")]
    // Once: still to come, or past (not listed).
    [InlineData(10, 5, 2026, false, "2026-10-05")]
    [InlineData(9, 4, 2026, false, null)]
    // 29 February falls on 28 February in a year without it.
    [InlineData(2, 29, 2000, true, "2027-02-28")]
    public void Next_occurrence(int month, int day, int? year, bool everyYear, string? expected)
    {
        var next = Date(month, day, year, everyYear).NextOccurrence(Today);

        Assert.Equal(expected is null ? null : DateOnly.Parse(expected), next);
    }

    [Theory]
    [InlineData(ReminderLead.OnTheDay, "2026-10-07")]
    [InlineData(ReminderLead.OneDayBefore, "2026-10-06")]
    [InlineData(ReminderLead.ThreeDaysBefore, "2026-10-04")]
    [InlineData(ReminderLead.OneWeekBefore, "2026-09-30")]
    [InlineData(ReminderLead.TwoWeeksBefore, "2026-09-23")]
    [InlineData(ReminderLead.OneMonthBefore, "2026-09-07")]
    public void Reminder_day(ReminderLead lead, string expected)
    {
        Assert.Equal(DateOnly.Parse(expected), Date(10, 7, lead: lead).ReminderDay(new DateOnly(2026, 10, 7)));
    }

    // "1 month before" a day the month before lacks falls on that month's last day.
    [Fact]
    public void One_month_before_the_31st_falls_on_the_last_day_of_the_month_before()
    {
        Assert.Equal(new DateOnly(2026, 9, 30), Date(10, 31, lead: ReminderLead.OneMonthBefore).ReminderDay(new DateOnly(2026, 10, 31)));
    }

    [Theory]
    [InlineData(1962, 64)]
    [InlineData(null, null)]
    [InlineData(2026, null)]
    public void Years_on_an_occurrence(int? year, int? expected)
    {
        Assert.Equal(expected, Date(10, 7, year).YearsOn(new DateOnly(2026, 10, 7)));
    }

    [Theory]
    [InlineData(2, 29, null, true)]
    [InlineData(2, 29, 2027, false)]
    [InlineData(2, 29, 2028, true)]
    [InlineData(4, 31, null, false)]
    [InlineData(13, 1, null, false)]
    [InlineData(1, 0, null, false)]
    public void Is_a_day(int month, int day, int? year, bool expected)
    {
        Assert.Equal(expected, KeyDate.IsDay(month, day, year));
    }

    [Fact]
    public void Preferences_start_at_the_defaults()
    {
        var defaults = ReminderPreferences.Defaults(Guid.NewGuid());

        Assert.Equal(ReminderLead.OneWeekBefore, defaults.DefaultFor(KeyDateKind.Birthday, ReminderLead.OneWeekBefore));
        Assert.Equal(ReminderLead.ThreeDaysBefore, defaults.DefaultFor(KeyDateKind.Anniversary, null));
        Assert.Equal(ReminderLead.OnTheDay, defaults.DefaultFor(KeyDateKind.Milestone, null));
        Assert.Equal(ReminderLead.OneWeekBefore, defaults.DefaultFor(KeyDateKind.Other, null));
    }

    // A birthday follows the Owner's default until the person chooses, one case per source (L2-173, L2-139 AC4).
    [Theory]
    [InlineData(null, ReminderLead.ThreeDaysBefore, ReminderLead.ThreeDaysBefore)]
    [InlineData(null, null, null)]
    [InlineData(ReminderLead.OnTheDay, ReminderLead.ThreeDaysBefore, ReminderLead.OnTheDay)]
    [InlineData(ReminderLead.OnTheDay, null, ReminderLead.OnTheDay)]
    public void A_birthday_takes_the_persons_lead_else_the_owners_default(ReminderLead? own, ReminderLead? owners, ReminderLead? expected)
    {
        var preferences = ReminderPreferences.Defaults(Guid.NewGuid());
        preferences.Change(own, ReminderLead.ThreeDaysBefore, ReminderLead.OnTheDay);

        Assert.Equal(expected, preferences.DefaultFor(KeyDateKind.Birthday, owners));
    }
}
