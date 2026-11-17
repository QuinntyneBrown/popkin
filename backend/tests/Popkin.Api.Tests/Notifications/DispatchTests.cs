using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The dispatcher (docs/detailed-designs/notifications/deliver-notifications): a change adds a
/// notification event beside it, and each tick of the Worker fans the events out and sends what
/// is due (L2-161, L2-175).
/// </summary>
public sealed class DispatchTests
{
    // Given Ruth's message in Everyone and Ruth's phone allowing alerts,
    // when Joel replies to it and the dispatcher ticks,
    // then Ruth's phone gets one alert naming the Popkin and Joel, opening Everyone, with none
    // of the reply's words; Joel and Mara get nothing;
    // and a second tick sends nothing more (L2-157, L2-174 AC3, L2-175 AC3).
    [Fact]
    public async Task A_reply_reaches_the_phone_of_the_member_replied_to_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        await ruth.AllowsAlertsAsync();
        await joel.AllowsAlertsAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down for the paddles");
        await api.DispatchAsync();
        await api.DispatchAsync();

        var (to, alert) = Assert.Single(api.PhoneAlerts.Sent);
        Assert.Equal(await ruth.PersonIdAsync(), to);
        Assert.Equal("Lakeside Weekend", alert.Title);
        Assert.Equal("Joel replied to you", alert.Body);
        Assert.Equal($"/p/{lakeside.Id}/chat/everyone", alert.Url);
    }
}
