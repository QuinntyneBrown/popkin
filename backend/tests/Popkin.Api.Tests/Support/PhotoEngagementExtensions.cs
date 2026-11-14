using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure.Persistence;

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

    /// <summary>The photo's comments, oldest first.</summary>
    public static Task<HttpResponseMessage> PhotoCommentsAsync(this HttpClient member, Guid popkinId, Guid photoId) =>
        member.GetAsync($"{PhotoPath(popkinId, photoId)}/comments");

    /// <summary>The comments of a photo the member may read.</summary>
    public static Task<JsonElement> ReadPhotoCommentsAsync(this HttpClient member, Guid popkinId, Guid photoId) =>
        member.GetFromJsonAsync<JsonElement>($"{PhotoPath(popkinId, photoId)}/comments");

    /// <summary>Posts a comment on the photo; a null text sends `{ text: null }`.</summary>
    public static Task<HttpResponseMessage> CommentOnPhotoAsync(this HttpClient member, Guid popkinId, Guid photoId, string? text) =>
        member.PostAsJsonAsync($"{PhotoPath(popkinId, photoId)}/comments", new { text });

    /// <summary>Posts a comment that must be stored, and returns it.</summary>
    public static async Task<JsonElement> CommentedOnPhotoAsync(this HttpClient member, Guid popkinId, Guid photoId, string text)
    {
        var response = await member.CommentOnPhotoAsync(popkinId, photoId, text);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Task<HttpResponseMessage> DeletePhotoCommentAsync(this HttpClient member, Guid popkinId, Guid photoId, Guid commentId) =>
        member.DeleteAsync($"{PhotoPath(popkinId, photoId)}/comments/{commentId}");

    /// <summary>The texts of a list of comments, in its order.</summary>
    public static List<string> CommentTexts(this JsonElement comments) =>
        comments.EnumerateArray().Select(c => c.GetProperty("text").GetString()!).ToList();

    /// <summary>Asks for the address the photo is saved from.</summary>
    public static Task<HttpResponseMessage> PhotoDownloadAsync(this HttpClient member, Guid popkinId, Guid photoId) =>
        member.GetAsync($"{PhotoPath(popkinId, photoId)}/download");

    public static Task<HttpResponseMessage> DeletePhotoAsync(this HttpClient member, Guid popkinId, Guid photoId) =>
        member.DeleteAsync(PhotoPath(popkinId, photoId));

    /// <summary>How many reactions and comments the store holds for the photo, whoever gave them.</summary>
    public static (int Reactions, int Comments) EngagementOf(this ApiFactory api, Guid photoId)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (db.PhotoReactions.Count(r => r.PhotoId == photoId), db.PhotoComments.Count(c => c.PhotoId == photoId));
    }

    /// <summary>The stored keys of the photo's files: the display image, the thumbnail and the original size.</summary>
    public static (string Display, string Thumbnail, string? Original) FileKeysOf(this ApiFactory api, Guid photoId)
    {
        using var scope = api.Services.CreateScope();
        var photo = scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Single(p => p.Id == photoId);
        return (photo.StorageKey, photo.ThumbnailKey, photo.OriginalKey);
    }

    /// <summary>One message of a thread, as the member reads it.</summary>
    public static async Task<JsonElement> MessageAsync(this HttpClient member, Guid popkinId, Guid threadId, Guid messageId) =>
        (await member.MessagesAsync(popkinId, threadId)).GetProperty("items").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == messageId);

    /// <summary>The id of the photo a message carries.</summary>
    public static Guid PhotoIdOf(this JsonElement message) => message.GetProperty("photo").GetProperty("id").GetGuid();
}
