using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class PhotoExtensions
{
    /// <summary>Adds a file to the Popkin's album, with a caption when given. A null file sends none.</summary>
    public static Task<HttpResponseMessage> AddPhotoAsync(
        this HttpClient member, Guid popkinId, byte[]? file, string? caption = null, string fileName = "photo.jpg", string contentType = "image/jpeg")
    {
        var form = new MultipartFormDataContent();
        if (file is not null)
        {
            var content = new ByteArrayContent(file);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            form.Add(content, "file", fileName);
        }

        if (caption is not null)
        {
            form.Add(new StringContent(caption), "caption");
        }

        return member.PostAsync($"/api/popkins/{popkinId}/photos", form);
    }

    /// <summary>Adds a photo that must be stored, and returns it.</summary>
    public static async Task<JsonElement> AddedPhotoAsync(this HttpClient member, Guid popkinId, byte[] file, string? caption = null)
    {
        var response = await member.AddPhotoAsync(popkinId, file, caption);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>A page of the album; `query` is the query string without its question mark.</summary>
    public static Task<JsonElement> AlbumAsync(this HttpClient member, Guid popkinId, string query = "") =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/photos?{query}");

    public static Task<JsonElement> PhotoAsync(this HttpClient member, Guid popkinId, Guid photoId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/photos/{photoId}");

    public static List<Guid> PhotoIds(this JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()).ToList();

    /// <summary>
    /// Adds photos by one member straight to the store, `apart` after one another, for an album
    /// larger than is worth encoding image by image. No file is written: only their facts are
    /// read here. Returns their ids in the order added.
    /// </summary>
    public static async Task<List<Guid>> AddPhotosAsync(this ApiFactory api, Guid popkinId, string displayName, int count, TimeSpan apart)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uploader = db.Memberships.Single(m => m.PopkinId == popkinId && m.DisplayName == displayName);
        var photos = new List<Photo>();
        for (var number = 1; number <= count; number++)
        {
            api.Clock.Advance(apart);
            var name = $"popkins/{popkinId:N}/{Guid.NewGuid():N}";
            photos.Add(Photo.Add(
                Guid.NewGuid(), popkinId, uploader.Id, $"Photo {number} by {displayName}", capturedAt: null, api.Clock.GetUtcNow(),
                $"{name}.jpg", $"{name}-thumbnail.jpg", 2048, 1365, "image/jpeg"));
        }

        db.Photos.AddRange(photos);
        await db.SaveChangesAsync();
        return photos.Select(p => p.Id).ToList();
    }
}
