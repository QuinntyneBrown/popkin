using System.Globalization;
using Popkin.Application.Notifications.Digests;
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

/// <summary>DigestRules, one case per row (digest-emails, L2-165).</summary>
public sealed class DigestRulesTests
{
    private static DateTimeOffset Local(string at) => DateTimeOffset.Parse(at, CultureInfo.InvariantCulture);

    // Frequency | local time | due
    [Theory]
    [InlineData(NotificationFrequency.DailyDigest, "2026-11-18T17:59:00+00:00", false)]
    [InlineData(NotificationFrequency.DailyDigest, "2026-11-18T18:00:00+00:00", true)]
    [InlineData(NotificationFrequency.DailyDigest, "2026-11-18T23:30:00+13:00", true)]
    [InlineData(NotificationFrequency.AsItHappens, "2026-11-18T18:00:00+00:00", true)]
    [InlineData(NotificationFrequency.WeeklyDigest, "2026-11-20T18:00:00+00:00", false)]
    [InlineData(NotificationFrequency.WeeklyDigest, "2026-11-22T17:59:00+00:00", false)]
    [InlineData(NotificationFrequency.WeeklyDigest, "2026-11-22T18:00:00+00:00", true)]
    public void A_digest_is_due_from_six_and_the_weekly_on_Sunday(NotificationFrequency frequency, string local, bool due) =>
        Assert.Equal(due, DigestRules.IsDue(frequency, Local(local)));

    // Previous | weekly | from
    [Theory]
    [InlineData("2026-11-17T18:02:00Z", false, "2026-11-17T18:02:00Z")]
    [InlineData(null, false, "2026-11-17T18:00:00Z")]
    [InlineData(null, true, "2026-11-11T18:00:00Z")]
    public void The_period_runs_from_the_previous_digest_or_a_day_or_a_week(string? previous, bool weekly, string from) =>
        Assert.Equal(Local(from), DigestRules.PeriodStart(previous is null ? null : Local(previous), Local("2026-11-18T18:00:00Z"), weekly));

    // Weekly | needs you | changes | Popkins | subject
    [Theory]
    [InlineData(false, 3, 23, 3, "Your day in Popkin: 3 things need you")]
    [InlineData(false, 1, 5, 1, "Your day in Popkin: 1 thing needs you")]
    [InlineData(false, 0, 23, 3, "Your day in Popkin: 23 new things across 3 Popkins")]
    [InlineData(false, 0, 1, 1, "Your day in Popkin: 1 new thing across 1 Popkin")]
    [InlineData(true, 0, 9, 2, "Your week in Popkin: 9 new things across 2 Popkins")]
    [InlineData(true, 2, 9, 2, "Your week in Popkin: 2 things need you")]
    public void The_subject_counts_what_needs_the_person_or_what_is_new(bool weekly, int needsYou, int changes, int popkins, string subject) =>
        Assert.Equal(subject, DigestRules.Subject(weekly, needsYou, changes, popkins));

    // Kind | for the person | rank
    [Theory]
    [InlineData(NotificationKind.GroupChat, true, 0)]
    [InlineData(NotificationKind.PlanChanges, false, 1)]
    [InlineData(NotificationKind.PeopleJoining, false, 2)]
    [InlineData(NotificationKind.NewPhotos, false, 3)]
    [InlineData(NotificationKind.ScheduleChanges, false, 4)]
    [InlineData(NotificationKind.Experiences, false, 5)]
    [InlineData(NotificationKind.GroupChat, false, 6)]
    public void Lines_go_the_persons_own_first_and_the_chat_last(NotificationKind kind, bool forThePerson, int rank) =>
        Assert.Equal(rank, DigestRules.LineRank(kind, forThePerson));

    [Fact]
    public void Sections_go_most_first_and_a_tie_to_the_newest()
    {
        var sections = new[] { ("Quiz", 2, Local("2026-11-18T10:00:00Z")), ("Cabin", 5, Local("2026-11-18T09:00:00Z")), ("Tigers", 2, Local("2026-11-18T11:00:00Z")) };

        var order = DigestRules.OrderSections(sections, s => s.Item2, s => s.Item3).Select(s => s.Item1);

        Assert.Equal(["Cabin", "Tigers", "Quiz"], order);
    }

    // Messages | words
    [Theory]
    [InlineData(0, null)]
    [InlineData(1, "and 1 message in the chat")]
    [InlineData(17, "and 17 messages in the chat")]
    public void The_chat_count_reads_singular_or_plural(int n, string? words) =>
        Assert.Equal(words, DigestRules.MoreMessages(n));

    [Fact]
    public void The_weekly_says_so() =>
        Assert.Equal(("Everything since last Sunday", true), (DigestRules.PeriodLine(true), DigestRules.Reason(true).Contains("Sunday at 6 pm", StringComparison.Ordinal)));
}
