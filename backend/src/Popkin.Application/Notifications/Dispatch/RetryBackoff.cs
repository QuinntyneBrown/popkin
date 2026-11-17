namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// When a notification that failed for a passing reason is tried again: 30 s, 2 min, 10 min,
/// 30 min, 1 h, then each hour, until six hours after it first fell due (L2-175 AC2).
/// </summary>
public static class RetryBackoff
{
    public static readonly TimeSpan GiveUpAfter = TimeSpan.FromHours(6);

    private static readonly TimeSpan[] Steps =
    [
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(2),
        TimeSpan.FromMinutes(10),
        TimeSpan.FromMinutes(30),
        TimeSpan.FromHours(1),
    ];

    /// <summary>The wait after the `failures`-th failure.</summary>
    public static TimeSpan After(int failures) => Steps[Math.Clamp(failures, 1, Steps.Length) - 1];

    public static bool GivenUp(DateTimeOffset due, DateTimeOffset now) => now - due >= GiveUpAfter;
}
