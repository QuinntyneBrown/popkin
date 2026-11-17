using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>Who is held without an admin, and releasing a hold, one case per row (L2-172 AC4, AC5).</summary>
public sealed class NotificationHoldRulesTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void An_account_in_use_is_not_held() =>
        Assert.Null(NotificationHoldRules.HeldAutomatically(null, null));

    [Fact]
    public void An_account_being_deleted_is_held_until_deleted() =>
        Assert.Equal(NotificationHoldUntil.UntilDeleted, NotificationHoldRules.HeldAutomatically(Now, null));

    [Fact]
    public void An_erased_account_is_no_longer_listed() =>
        Assert.Null(NotificationHoldRules.HeldAutomatically(Now, Now.AddDays(30)));

    [Fact]
    public void An_active_hold_is_released_once()
    {
        var hold = NotificationHold.OnPopkin(Guid.NewGuid(), Guid.NewGuid(), "Aiko Tanaka", "Spam", Now);

        Assert.True(hold.Release(Guid.NewGuid(), "Reviewed", Now.AddHours(1)));
        Assert.False(hold.IsActive);
        Assert.False(hold.Release(Guid.NewGuid(), "Again", Now.AddHours(2)));
        Assert.Equal("Reviewed", hold.ReleaseReason);
    }
}
