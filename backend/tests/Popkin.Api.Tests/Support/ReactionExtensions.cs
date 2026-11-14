using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class ReactionExtensions
{
    private static string ReactionPath(Guid popkinId, Guid threadId, Guid messageId, string emoji) =>
        $"/api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}/reactions/{Uri.EscapeDataString(emoji)}";

    /// <summary>Adds the member's reaction, the emoji URL-encoded in the path.</summary>
    public static Task<HttpResponseMessage> ReactAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId, string emoji) =>
        member.PutAsync(ReactionPath(popkinId, threadId, messageId, emoji), null);

    /// <summary>Adds a reaction that must be stored, and returns the message's summary.</summary>
    public static async Task<JsonElement> ReactedAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId, string emoji)
    {
        var response = await member.ReactAsync(popkinId, threadId, messageId, emoji);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>Takes the member's reaction away.</summary>
    public static Task<HttpResponseMessage> UnreactAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId, string emoji) =>
        member.DeleteAsync(ReactionPath(popkinId, threadId, messageId, emoji));

    /// <summary>Deletes one's own message by its id.</summary>
    public static Task<HttpResponseMessage> DeleteMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId) =>
        member.DeleteAsync($"/api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}");

    /// <summary>A summary of reactions, one "{emoji} {membership ids}" per chip, in its order.</summary>
    public static List<string> Summary(this JsonElement reactions) =>
        reactions.EnumerateArray()
            .Select(r => Chip(r.GetProperty("emoji").GetString()!, r.GetProperty("membershipIds").EnumerateArray().Select(id => id.GetGuid()).ToArray()))
            .ToList();

    public static string Chip(string emoji, params Guid[] membershipIds) => $"{emoji} {string.Join(",", membershipIds)}";
}
