using System.Net.Http.Json;

namespace Popkin.Api.Tests.Support;

public static class NotificationExtensions
{
    /// <summary>A new person who signed up with an email address, signed in.</summary>
    public static async Task<HttpClient> SignedUpByEmailAsync(this ApiFactory api, string name, string email)
    {
        var client = api.CreateBrowserClient();
        var verificationId = await client.RequestCodeAsync(email, channel: "Email");
        var code = api.Codes.Sent.Last().Code;
        var response = await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code, name });
        response.EnsureSuccessStatusCode();
        return client;
    }

    /// <summary>The member's phone allowed alerts (ADR 0028): one push subscription is saved.</summary>
    public static async Task AllowsAlertsAsync(this HttpClient member)
    {
        var device = new { endpoint = $"https://push.example.com/send/{Guid.NewGuid():N}", p256dh = "BPub", auth = "auth" };
        (await member.PostAsJsonAsync("/api/me/push-subscriptions", device)).EnsureSuccessStatusCode();
    }

    /// <summary>One tick of the dispatcher, as the Worker runs it every 15 seconds.</summary>
    public static Task DispatchAsync(this ApiFactory api) =>
        api.SendAsync(new Popkin.Application.Notifications.Dispatch.DispatchNotificationsCommand());

    /// <summary>A reply to `messageId` in `threadId`.</summary>
    public static async Task RepliedAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId, string text) =>
        (await member.PostAsJsonAsync(
            $"/api/popkins/{popkinId}/threads/{threadId}/messages",
            new { clientMessageId = Guid.NewGuid(), text, replyToMessageId = messageId })).EnsureSuccessStatusCode();

    /// <summary>The signed-in person's id, from their session.</summary>
    public static async Task<Guid> PersonIdAsync(this HttpClient member) =>
        (await member.GetFromJsonAsync<System.Text.Json.JsonElement>("/api/auth/session")).GetProperty("personId").GetGuid();
}
