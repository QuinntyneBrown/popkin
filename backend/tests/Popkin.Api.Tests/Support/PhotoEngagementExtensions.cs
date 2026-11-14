using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

/// <summary>Reacting to, commenting on, saving and deleting a photo (journey 14).</summary>
public static class PhotoEngagementExtensions
{
    private static string PhotoPath(Guid popkinId, Guid photoId) => $"/api/popkins/{popkinId}/photos/{photoId}";

    private static string ReactionPath(Guid popkinId, Guid photoId, string emoji) =>
        $"{PhotoPath(popkinId, photoId)}/reactions/{Uri.EscapeDataString(emoji)}";

    /// <summary>Adds the member's reaction to the photo, the emoji URL-encoded in the path.</summary>
    public static Task<HttpResponseMessage> ReactToPhotoAsync(this HttpClient member, Guid popkinId, Guid photoId, string emoji) =>
        member.PutAsync(ReactionPath(popkinId, photoId, emoji), null);

    /// <summary>Takes the member's reaction to the photo away.</summary>
    public static Task<HttpResponseMessage> UnreactToPhotoAsync(this HttpClient member, Guid popkinId, Guid photoId, string emoji) =>
        member.DeleteAsync(ReactionPath(popkinId, photoId, emoji));

    /// <summary>Adds a reaction that must be stored, and returns the photo's reactions.</summary>
    public static async Task<JsonElement> ReactedToPhotoAsync(this HttpClient member, Guid popkinId, Guid photoId, string emoji)
    {
        var response = await member.ReactToPhotoAsync(popkinId, photoId, emoji);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>A photo's reactions, one "{emoji} {count}" per chip with " mine" when the reader gave it, in their order.</summary>
    public static List<string> Chips(this JsonElement reactions) =>
        reactions.EnumerateArray()
            .Select(r => $"{r.GetProperty("emoji").GetString()} {r.GetProperty("count").GetInt32()}{(r.GetProperty("mine").GetBoolean() ? " mine" : "")}")
            .ToList();

    /// <summary>The id of the photo a message carries.</summary>
    public static Guid PhotoIdOf(this JsonElement message) => message.GetProperty("photo").GetProperty("id").GetGuid();
}
