using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>Pausing and resuming member email, one case per state (admin-platform/notifications).</summary>
public sealed class NotificationPlatformTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Sending_pauses_with_who_and_why()
    {
        var platform = NotificationPlatform.Defaults();
        var admin = Guid.NewGuid();

        Assert.True(platform.PauseEmail(admin, "Lena Fischer", "Digest sending twice", Now));

        Assert.True(platform.IsPaused);
        Assert.Equal((Now, admin, "Lena Fischer", "Digest sending twice"), (platform.EmailPausedAt!.Value, platform.PausedByAdminId!.Value, platform.PausedByName, platform.PauseReason));
    }

    [Fact]
    public void Paused_does_not_pause_again_and_keeps_the_first_pause()
    {
        var platform = NotificationPlatform.Defaults();
        platform.PauseEmail(Guid.NewGuid(), "Lena Fischer", "First", Now);

        Assert.False(platform.PauseEmail(Guid.NewGuid(), "Aiko Tanaka", "Second", Now.AddMinutes(5)));

        Assert.Equal((Now, "Lena Fischer", "First"), (platform.EmailPausedAt!.Value, platform.PausedByName, platform.PauseReason));
    }

    [Fact]
    public void Paused_resumes_and_forgets_the_pause()
    {
        var platform = NotificationPlatform.Defaults();
        platform.PauseEmail(Guid.NewGuid(), "Lena Fischer", "First", Now);

        Assert.True(platform.ResumeEmail());

        Assert.False(platform.IsPaused);
        Assert.Null(platform.PausedByName);
        Assert.Null(platform.PauseReason);
    }

    [Fact]
    public void Sending_does_not_resume()
    {
        Assert.False(NotificationPlatform.Defaults().ResumeEmail());
    }
}
