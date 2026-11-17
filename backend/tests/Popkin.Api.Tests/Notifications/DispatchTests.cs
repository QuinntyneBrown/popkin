using System.Net.Http.Json;
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
        var (_, lakeside, everyone, ruth, joel, asked) = await RuthAskedAsync(api);

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down for the paddles");
        await api.DispatchAsync();
        await api.DispatchAsync();

        var (to, alert) = Assert.Single(api.PhoneAlerts.Sent);
        Assert.Equal(await ruth.PersonIdAsync(), to);
        Assert.Equal("Lakeside Weekend", alert.Title);
        Assert.Equal("Joel replied to you", alert.Body);
        Assert.Equal($"/p/{lakeside.Id}/chat/everyone", alert.Url);
    }

    private static readonly TimeZoneInfo London = TimeZoneInfo.FindSystemTimeZoneById("Europe/London");

    /// <summary>Moves the clock on to the next `hour` o'clock in London.</summary>
    private static void AdvanceToLondon(ApiFactory api, int hour)
    {
        var local = TimeZoneInfo.ConvertTime(api.Clock.GetUtcNow(), London);
        var day = local.Hour < hour ? local.Date : local.Date.AddDays(1);
        var target = TimeZoneInfo.ConvertTimeToUtc(day.AddHours(hour), London);
        api.Clock.Advance(new DateTimeOffset(target, TimeSpan.Zero) - api.Clock.GetUtcNow());
    }

    private sealed record Thread(ApiFactory Api, StartedPopkin Lakeside, Guid Everyone, HttpClient Ruth, HttpClient Joel, Guid Asked);

    /// <summary>Ruth's message in Everyone, and Ruth's and Joel's phones allowing alerts.</summary>
    private static async Task<Thread> RuthAskedAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        await ruth.AllowsAlertsAsync();
        await joel.AllowsAlertsAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        // What the setting up told the others is sent and forgotten.
        await api.DispatchAsync();
        api.PhoneAlerts.Clear();
        return new Thread(api, lakeside, everyone, ruth, joel, asked);
    }

    // Given Ruth in London, when Joel replies twice at 22:00, then nothing reaches her phone during
    // quiet hours, and at 08:00 one alert says what waited (L2-161 AC6, AC7).
    [Fact]
    public async Task Replies_in_quiet_hours_wait_for_8_am_and_go_as_one_alert()
    {
        using var api = new ApiFactory();
        var t = await RuthAskedAsync(api);
        (await t.Ruth.PutAsJsonAsync("/api/me/time-zone", new { zone = "Europe/London" })).EnsureSuccessStatusCode();
        AdvanceToLondon(api, 22);

        await t.Joel.RepliedAsync(t.Lakeside.Id, t.Everyone, t.Asked, "Put me down");
        await t.Joel.RepliedAsync(t.Lakeside.Id, t.Everyone, t.Asked, "And the oars");
        await api.DispatchAsync();
        AdvanceToLondon(api, 7);
        await api.DispatchAsync();
        var duringQuietHours = api.PhoneAlerts.Sent.Count;
        AdvanceToLondon(api, 8);
        await api.DispatchAsync();

        Assert.Equal(0, duringQuietHours);
        var (_, alert) = Assert.Single(api.PhoneAlerts.Sent);
        Assert.Equal("Lakeside Weekend", alert.Title);
        Assert.Equal("2 new things while you were away", alert.Body);
        Assert.Equal($"/p/{t.Lakeside.Id}", alert.Url);
    }

    // Given Ruth turned "Mentions and replies" off on her phone, when Joel replies, then her phone
    // gets nothing (L2-157 AC3).
    [Fact]
    public async Task A_kind_switched_off_on_the_phone_sends_no_alert()
    {
        using var api = new ApiFactory();
        var t = await RuthAskedAsync(api);
        (await t.Ruth.PutAsJsonAsync("/api/me/notifications/kinds/MentionsAndReplies", new { phone = false })).EnsureSuccessStatusCode();

        await t.Joel.RepliedAsync(t.Lakeside.Id, t.Everyone, t.Asked, "Put me down");
        await api.DispatchAsync();

        Assert.Empty(api.PhoneAlerts.Sent);
    }

    // Given a reply held for the end of quiet hours, when Ruth leaves Lakeside before then, then
    // nothing about it reaches her (L2-174 AC1).
    [Fact]
    public async Task A_member_who_left_before_the_alert_is_sent_gets_nothing()
    {
        using var api = new ApiFactory();
        var t = await RuthAskedAsync(api);
        (await t.Ruth.PutAsJsonAsync("/api/me/time-zone", new { zone = "Europe/London" })).EnsureSuccessStatusCode();
        AdvanceToLondon(api, 22);
        await t.Joel.RepliedAsync(t.Lakeside.Id, t.Everyone, t.Asked, "Put me down");
        await api.DispatchAsync();

        (await t.Ruth.DeleteAsync($"/api/popkins/{t.Lakeside.Id}/members/me")).EnsureSuccessStatusCode();
        AdvanceToLondon(api, 8);
        await api.DispatchAsync();

        Assert.Empty(api.PhoneAlerts.Sent);
    }
}
