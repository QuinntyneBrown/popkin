using Popkin.Api.Tests.Support;
using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// What became of each notification is kept 90 days, then removed (deliver-notifications,
/// `PurgeNotificationHistoryJob`): long after any retry (6 hours) or digest period (7 days).
/// </summary>
public sealed class PurgeNotificationHistoryTests
{
    // Given a reply that reached Ruth's inbox, when 90 days have not yet passed, then nothing is
    // removed; once they have, its event, delivery and email go, and a second purge finds none.
    [Fact]
    public async Task History_goes_after_90_days_and_only_then()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        await api.DispatchAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "On it");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        Assert.Single(api.NotificationEmails.Sent);

        api.Clock.Advance(TimeSpan.FromDays(90) - TimeSpan.FromMinutes(11));
        var early = await api.SendAsync(new PurgeNotificationHistoryCommand());
        api.Clock.Advance(TimeSpan.FromMinutes(12));
        var due = await api.SendAsync(new PurgeNotificationHistoryCommand());
        var again = await api.SendAsync(new PurgeNotificationHistoryCommand());

        Assert.Equal(0, early);
        Assert.True(due >= 3, $"{due} rows removed");
        Assert.Equal(0, again);
    }
}
