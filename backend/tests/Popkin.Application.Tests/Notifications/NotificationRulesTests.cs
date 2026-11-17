using Popkin.Application.Notifications.Dispatch;
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

/// <summary>
/// NotificationRules, one case per row of the rules table in deliver-notifications (L2-161 AC1)
/// and per cell of the levels of L2-158. Noon in London is outside quiet hours; 22:00 is inside.
/// </summary>
public sealed class NotificationRulesTests
{
    private static readonly TimeZoneInfo London = TimeZoneInfo.FindSystemTimeZoneById("Europe/London");
    private static readonly DateTimeOffset Noon = new(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset TenAtNight = new(2026, 11, 17, 22, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset EightNextMorning = new(2026, 11, 18, 8, 0, 0, TimeSpan.Zero);

    private static NotificationQuestion Ask(
        NotificationChannel channel = NotificationChannel.Phone,
        NotificationKind kind = NotificationKind.GroupChat,
        DateTimeOffset? now = null) => new(kind, channel, now ?? Noon, London);

    public static TheoryData<string, NotificationQuestion, SuppressionRule> Stops => new()
    {
        { "1 the recipient is the actor", Ask() with { RecipientIsActor = true, RecipientIsActiveMember = false }, SuppressionRule.OwnAction },
        { "2 no longer an active member", Ask() with { RecipientIsActiveMember = false, PopkinWrappedUp = true }, SuppressionRule.NotAMember },
        { "3 the Popkin has wrapped up", Ask() with { PopkinWrappedUp = true, FeatureOff = true }, SuppressionRule.WrappedUp },
        { "4 the kind's feature is off", Ask(kind: NotificationKind.PlanChanges) with { FeatureOff = true, HasDevice = false }, SuppressionRule.FeatureOff },
        { "5 no email address", Ask(NotificationChannel.Email) with { HasAddress = false, EmailPaused = true }, SuppressionRule.NoAddress },
        { "6 no device", Ask() with { HasDevice = false, KindOffForEveryone = true }, SuppressionRule.NoDevice },
        { "8 the kind is off for everyone", Ask() with { KindOffForEveryone = true, Held = true }, SuppressionRule.KindOffForEveryone },
        { "9 held", Ask() with { Held = true, ActorMuted = true }, SuppressionRule.Held },
        { "10 email turned off", Ask(NotificationChannel.Email) with { EmailOn = false, ActorMuted = true }, SuppressionRule.Unsubscribed },
        { "11 the actor is muted", Ask() with { ActorMuted = true, Level = NotificationLevel.Muted }, SuppressionRule.MutedPerson },
        { "12 the Popkin is muted", Ask() with { Level = NotificationLevel.Muted, SwitchOn = false }, SuppressionRule.PopkinMuted },
        { "13 just for me, group chat", Ask() with { Level = NotificationLevel.JustForMe, SwitchOn = false }, SuppressionRule.JustForMe },
        { "14 the person's switch is off", Ask(now: TenAtNight) with { SwitchOn = false }, SuppressionRule.KindSwitchedOff },
    };

    [Theory]
    [MemberData(nameof(Stops))]
    public void The_first_rule_that_applies_stops_it(string row, NotificationQuestion question, SuppressionRule rule)
    {
        var decision = NotificationRules.Decide(question);

        Assert.True(decision.Rule == rule, $"Row {row}: expected {rule}, got {decision.Outcome} {decision.Rule}");
        Assert.Equal(NotificationOutcome.Suppress, decision.Outcome);
    }

    // Row 5 and 10 are email's alone: a phone alert is not stopped by them.
    [Fact]
    public void An_address_and_email_off_do_not_stop_a_phone_alert()
    {
        var decision = NotificationRules.Decide(Ask() with { HasAddress = false, EmailOn = false, EmailPaused = true });

        Assert.Equal(NotificationOutcome.Send, decision.Outcome);
    }

    // Row 6 is the phone's alone.
    [Fact]
    public void No_device_does_not_stop_an_email() =>
        Assert.Equal(NotificationOutcome.Send, NotificationRules.Decide(Ask(NotificationChannel.Email) with { HasDevice = false }).Outcome);

    // Row 4 applies only to a kind with a feature.
    [Fact]
    public void A_feature_off_does_not_stop_a_kind_without_one() =>
        Assert.Equal(NotificationOutcome.Send, NotificationRules.Decide(Ask(kind: NotificationKind.GroupChat) with { FeatureOff = true }).Outcome);

    // Row 7: paused email is held, not stopped (L2-170), and rows 1 to 6 come first.
    [Fact]
    public void Paused_email_is_queued_and_phone_alerts_go_on()
    {
        Assert.Equal(NotificationOutcome.Queue, NotificationRules.Decide(Ask(NotificationChannel.Email) with { EmailPaused = true, KindOffForEveryone = true }).Outcome);
        Assert.Equal(NotificationOutcome.Send, NotificationRules.Decide(Ask() with { EmailPaused = true }).Outcome);
    }

    // Rows 15 and 16: inside quiet hours, both channels wait for 08:00 where the person is.
    [Theory]
    [InlineData(NotificationChannel.Phone)]
    [InlineData(NotificationChannel.Email)]
    public void Inside_quiet_hours_it_waits_for_their_end(NotificationChannel channel)
    {
        var decision = NotificationRules.Decide(Ask(channel, now: TenAtNight));

        Assert.Equal(NotificationOutcome.Send, decision.Outcome);
        Assert.Equal(EightNextMorning, decision.At);
    }

    // Row 17.
    [Fact]
    public void Otherwise_it_is_sent_now()
    {
        var decision = NotificationRules.Decide(Ask());

        Assert.Equal(NotificationOutcome.Send, decision.Outcome);
        Assert.Equal(Noon, decision.At);
    }

    // L2-158: each level against each kind it treats differently.
    [Theory]
    [InlineData(NotificationLevel.Everything, NotificationKind.GroupChat, false, true)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.GroupChat, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.NewPhotos, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.ScheduleChanges, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.PeopleJoining, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.Experiences, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.PlanChanges, false, false)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.PlanChanges, true, true)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.MentionsAndReplies, true, true)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.DirectMessages, true, true)]
    [InlineData(NotificationLevel.JustForMe, NotificationKind.StoriesDue, true, true)]
    [InlineData(NotificationLevel.Muted, NotificationKind.MentionsAndReplies, true, false)]
    [InlineData(NotificationLevel.Muted, NotificationKind.DirectMessages, true, false)]
    [InlineData(NotificationLevel.Muted, NotificationKind.StoriesDue, true, true)]
    [InlineData(NotificationLevel.Muted, NotificationKind.PopkinWrappingUp, false, true)]
    public void Each_level_lets_through_what_L2_158_says(NotificationLevel level, NotificationKind kind, bool named, bool sends)
    {
        var decision = NotificationRules.Decide(Ask(kind: kind) with { Level = level, RecipientIsNamed = named });

        Assert.Equal(sends, decision.Outcome == NotificationOutcome.Send);
    }
}
