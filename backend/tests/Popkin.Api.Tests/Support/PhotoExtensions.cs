using System.Net.Http.Json;
using System.Text.Json;

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
}
