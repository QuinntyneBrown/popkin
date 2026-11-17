using System.Net.Http.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The Popkin update email (docs/detailed-designs/notifications/popkin-update-email): "As it
/// happens" sends one email per change, or one per bundle of the changes in the bundling window
/// (L2-161 AC3, L2-163, L2-164), through the Worker's dispatcher.
/// </summary>
public sealed class UpdateEmailTests
{
    private sealed record Lakeside(ApiFactory Api, StartedPopkin Popkin, Guid Everyone, HttpClient Ruth, HttpClient Joel, Guid Asked);

    /// <summary>Ruth, signed up by email, asked something in Everyone; what that told the others is sent.</summary>
    private static async Task<Lakeside> RuthAskedAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        api.Clock.Advance(TimeSpan.FromMinutes(11));
        await api.DispatchAsync();
        api.NotificationEmails.Clear();
        return new Lakeside(api, lakeside, everyone, ruth, joel, asked);
    }

    // Given Ruth's message in Everyone, when Joel replies to it, then no email is sent before the
    // 10-minute window ends; when it ends, one email reaches Ruth from "Joel via Popkin", naming
    // the reply and Lakeside, with the reply in both parts, a link to the thread and the footer;
    // nothing reaches Joel; and a later tick sends nothing more (L2-163, L2-164 AC1, L2-175 AC3).
    [Fact]
    public async Task A_reply_reaches_the_inbox_of_the_member_replied_to_once_after_the_window()
    {
        using var api = new ApiFactory();
        var (_, lakeside, everyone, _, joel, asked) = await RuthAskedAsync(api);

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down for the paddles & oars");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(9));
        await api.DispatchAsync();
        var beforeTheWindowEnds = api.NotificationEmails.Sent.Count;
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await api.DispatchAsync();
        await api.DispatchAsync();

        Assert.Equal(0, beforeTheWindowEnds);
        var email = Assert.Single(api.NotificationEmails.Sent);
        Assert.Equal("ruth@example.com", email.To);
        Assert.Equal("Joel via Popkin", email.FromDisplayName);
        Assert.Equal("Joel replied to you in Lakeside Weekend", email.Email.Subject);
        Assert.Contains("Put me down for the paddles &amp; oars", email.Email.Html);
        Assert.Contains("Put me down for the paddles & oars", email.Email.Text);
        Assert.Contains("Can someone grab the paddles?", email.Email.Text);
        Assert.Contains($"https://localhost/p/{lakeside.Id}/chat/everyone", email.Email.Text);
        Assert.Contains("Reply in Popkin", email.Email.Html);
        Assert.Contains("Unsubscribe from all email", email.Email.Html);
        Assert.Contains("1 Test Street, Testville", email.Email.Text);
        Assert.DoesNotContain("Also new", email.Email.Text);
    }

    // Given Joel's reply opened Ruth's bundle, when Mara writes to Ruth directly and Joel replies
    // again within the window, then one email holds all three: Joel's newest reply leads and the
    // two others are listed under "Also new in the last 10 minutes", newest first (L2-161 AC3,
    // L2-164 AC6).
    [Fact]
    public async Task Changes_within_the_window_ride_in_one_email()
    {
        using var api = new ApiFactory();
        var (_, lakeside, everyone, ruth, joel, asked) = await RuthAskedAsync(api);
        var direct = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await ruth.MembershipIdAsync(lakeside.Id));

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(3));
        await lakeside.Host.SentMessageAsync(lakeside.Id, direct, "Lunch after?");
        api.Clock.Advance(TimeSpan.FromMinutes(3));
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "And the oars");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        await api.DispatchAsync();

        var email = Assert.Single(api.NotificationEmails.Sent);
        Assert.Equal("Joel replied to you in Lakeside Weekend", email.Email.Subject);
        var text = email.Email.Text;
        Assert.Contains("Also new in the last 10 minutes", text);
        var lunch = text.IndexOf("Mara: “Lunch after?”", StringComparison.Ordinal);
        var first = text.IndexOf("Joel: “Put me down”", StringComparison.Ordinal);
        Assert.True(lunch > 0 && first > lunch, text);
    }

    // Given Joel's reply in Ruth's bundle, when Ruth reads Everyone before the window ends, then no
    // email is sent, since nothing in it is new to her (L2-161 AC9).
    [Fact]
    public async Task A_reply_read_before_the_window_ends_is_not_emailed()
    {
        using var api = new ApiFactory();
        var (_, lakeside, everyone, ruth, joel, asked) = await RuthAskedAsync(api);
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down");
        var reply = (await ruth.MessagesAsync(lakeside.Id, everyone)).Ids().Last();
        await api.DispatchAsync();

        (await ruth.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{everyone}/read", new { lastReadMessageId = reply })).EnsureSuccessStatusCode();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();

        Assert.Empty(api.NotificationEmails.Sent);
        Assert.Equal(0, api.NotificationEmails.Attempts);
    }
}
