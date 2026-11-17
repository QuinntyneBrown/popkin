using Popkin.Application.Notifications.Emails;
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

/// <summary>The words of the key date reminder email, one case per row (send-reminders, L2-166).</summary>
public sealed class KeyDateReminderWordsTests
{
    private static readonly DateOnly Saturday = new(2026, 9, 19);

    private static KeyDate Date(KeyDateKind kind, int? year = null, string? title = null, ReminderLead lead = ReminderLead.OneWeekBefore) =>
        KeyDate.Create(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), kind, title, 9, 19, year, everyYear: true, lead, DateTimeOffset.UnixEpoch);

    // Kind | ahead or today | subject
    [Theory]
    [InlineData(KeyDateKind.Birthday, null, false, "Grace’s birthday is Saturday, Sep 19")]
    [InlineData(KeyDateKind.Birthday, null, true, "Today: Grace’s birthday")]
    [InlineData(KeyDateKind.Anniversary, null, false, "Grace’s anniversary is Saturday, Sep 19")]
    [InlineData(KeyDateKind.Milestone, "Iris is one month old", false, "Iris is one month old is Saturday, Sep 19")]
    [InlineData(KeyDateKind.Milestone, "Iris is one month old", true, "Today: Iris is one month old")]
    public void The_subject_names_the_day_ahead_and_says_today_on_it(KeyDateKind kind, string? title, bool today, string subject) =>
        Assert.Equal(subject, KeyDateReminderEmailComposer.Subject(Date(kind, title: title), "Grace", Saturday, today));

    // Kind | year known | headline on the day (AC2: the age only with a year)
    [Theory]
    [InlineData(KeyDateKind.Birthday, 1993, null, "Grace turns 33 today")]
    [InlineData(KeyDateKind.Birthday, null, null, "It’s Grace’s birthday today")]
    [InlineData(KeyDateKind.Anniversary, 2021, null, "It’s Grace’s anniversary today")]
    [InlineData(KeyDateKind.Other, null, "Grace & Femi’s wedding", "Grace & Femi’s wedding is today")]
    public void On_the_day_the_headline_says_today(KeyDateKind kind, int? year, string? title, string headline) =>
        Assert.Equal(headline, KeyDateReminderEmailComposer.TodayWords(Date(kind, year, title), "Grace", Saturday));

    // Lead | footer words
    [Theory]
    [InlineData(ReminderLead.OnTheDay, "on the day of")]
    [InlineData(ReminderLead.OneDayBefore, "1 day before")]
    [InlineData(ReminderLead.ThreeDaysBefore, "3 days before")]
    [InlineData(ReminderLead.OneWeekBefore, "1 week before")]
    [InlineData(ReminderLead.TwoWeeksBefore, "2 weeks before")]
    [InlineData(ReminderLead.OneMonthBefore, "1 month before")]
    public void The_footer_says_how_early_the_person_asked(ReminderLead lead, string words) =>
        Assert.Equal(words, KeyDateReminderEmailComposer.LeadWords(lead));
}
