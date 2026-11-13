using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class ChatExtensions
{
    /// <summary>The id of the Popkin's Everyone thread, as a member reads it.</summary>
    public static async Task<Guid> EveryoneThreadIdAsync(this HttpClient member, Guid popkinId) =>
        (await member.EveryoneThreadAsync(popkinId)).GetProperty("id").GetGuid();

    public static Task<JsonElement> EveryoneThreadAsync(this HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads/everyone");

    /// <summary>Posts a message under a new client message id, or the one given.</summary>
    public static Task<HttpResponseMessage> SendMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, string? text, Guid? clientMessageId = null) =>
        member.PostAsJsonAsync($"/api/popkins/{popkinId}/threads/{threadId}/messages", new { clientMessageId = clientMessageId ?? Guid.NewGuid(), text });

    /// <summary>Posts a message that must be stored, and returns it.</summary>
    public static async Task<JsonElement> SentMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, string text, Guid? clientMessageId = null)
    {
        var response = await member.SendMessageAsync(popkinId, threadId, text, clientMessageId);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>A page of the thread's messages; `query` is the query string without its question mark.</summary>
    public static Task<JsonElement> MessagesAsync(this HttpClient member, Guid popkinId, Guid threadId, string query = "") =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads/{threadId}/messages?{query}");

    public static List<string?> Texts(this JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(m => m.GetProperty("text").GetString()).ToList();
}
