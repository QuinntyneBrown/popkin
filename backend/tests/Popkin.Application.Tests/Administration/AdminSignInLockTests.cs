using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>
/// The admin app's lock on wrong codes: the third locks the email for 15 minutes, a correct code is
/// refused while it holds, and it lifts by itself (L2-088 AC5, AC6). One case per row of the
/// design's table (Admin sign in).
/// </summary>
public sealed class AdminSignInLockTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 42, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(0, 2)] // 0 wrong, a wrong code: 2 tries left
    [InlineData(1, 1)] // 1 wrong, a wrong code: 1 try left
    public void A_wrong_code_counts_down_the_tries(int wrongBefore, int triesLeft)
    {
        var signInLock = LockWith(wrongBefore);

        signInLock.RecordWrong(Now);

        Assert.Equal(triesLeft, signInLock.TriesLeft);
        Assert.False(signInLock.IsLocked(Now));
    }

    [Fact]
    public void The_third_wrong_code_locks_the_email_for_15_minutes()
    {
        var signInLock = LockWith(2);

        signInLock.RecordWrong(Now);

        Assert.True(signInLock.IsLocked(Now));
        Assert.Equal(Now + TimeSpan.FromMinutes(15), signInLock.LockedUntil);
    }

    [Fact]
    public void The_lock_holds_until_15_minutes_have_passed()
    {
        var signInLock = LockWith(3);

        Assert.True(signInLock.IsLocked(Now + TimeSpan.FromMinutes(15) - TimeSpan.FromSeconds(1)));
        Assert.False(signInLock.IsLocked(Now + TimeSpan.FromMinutes(15)));
        Assert.Equal(3, signInLock.TriesLeft);
    }

    [Fact]
    public void A_correct_code_clears_the_wrong_ones()
    {
        var signInLock = LockWith(2);

        signInLock.Reset();

        Assert.Equal(3, signInLock.TriesLeft);
        Assert.False(signInLock.IsLocked(Now));
    }

    private static AdminSignInLock LockWith(int wrong)
    {
        var signInLock = AdminSignInLock.For("owner@popkin.app");
        for (var i = 0; i < wrong; i++)
        {
            signInLock.RecordWrong(Now);
        }

        return signInLock;
    }
}
