using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Application.Tests.Notifications;

/// <summary>Whether the recipient muted whoever made the change (mute-people, "The rule").</summary>
public sealed class ActorMutedTests
{
    private static readonly Guid Joel = Guid.NewGuid();
    private static readonly Guid Ben = Guid.NewGuid();

    [Fact]
    public void A_muted_actor_is_muted() => Assert.True(NotificationRules.ActorMuted([Joel], Joel));

    [Fact]
    public void An_actor_not_muted_is_not() => Assert.False(NotificationRules.ActorMuted([Ben], Joel));

    [Fact]
    public void A_reminder_has_no_actor_to_mute() => Assert.False(NotificationRules.ActorMuted([Joel], null));

    [Fact]
    public void Someone_elses_mute_does_not_count() => Assert.False(NotificationRules.ActorMuted([], Joel));
}
