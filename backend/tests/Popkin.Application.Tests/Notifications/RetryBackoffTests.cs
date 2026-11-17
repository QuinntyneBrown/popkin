using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Application.Tests.Notifications;

/// <summary>The backoff of a passing failure (deliver-notifications, "Failures and retries"; L2-175 AC2).</summary>
public sealed class RetryBackoffTests
{
    private static readonly DateTimeOffset Due = new(2026, 11, 17, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(1, 30)]
    [InlineData(2, 120)]
    [InlineData(3, 600)]
    [InlineData(4, 1800)]
    [InlineData(5, 3600)]
    [InlineData(6, 3600)]
    [InlineData(9, 3600)]
    public void Each_failure_waits_longer_up_to_an_hour(int failures, int seconds) =>
        Assert.Equal(TimeSpan.FromSeconds(seconds), RetryBackoff.After(failures));

    [Theory]
    [InlineData(359, false)]
    [InlineData(360, true)]
    public void It_is_given_up_six_hours_after_it_fell_due(int minutes, bool dropped) =>
        Assert.Equal(dropped, RetryBackoff.GivenUp(Due, Due.AddMinutes(minutes)));
}
