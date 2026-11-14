using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class ChatPhotoExtensions
{
    /// <summary>Uploads a photo for a message of the thread (L2-026). A null file sends a form with another part and no file.</summary>
    public static Task<HttpResponseMessage> UploadThreadPhotoAsync(
        this HttpClient member, Guid popkinId, Guid threadId, byte[]? file, string fileName = "photo.jpg", string contentType = "image/jpeg")
    {
        var form = new MultipartFormDataContent();
        if (file is not null)
        {
            var content = new ByteArrayContent(file);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
            form.Add(content, "file", fileName);
        }
        else
        {
            form.Add(new StringContent("No photo here"), "note");
        }

        return member.PostAsync($"/api/popkins/{popkinId}/threads/{threadId}/photos", form);
    }

    /// <summary>Uploads a photo that must be stored, and returns its id.</summary>
    public static async Task<Guid> UploadedThreadPhotoIdAsync(this HttpClient member, Guid popkinId, Guid threadId, byte[]? file = null)
    {
        var response = await member.UploadThreadPhotoAsync(popkinId, threadId, file ?? TestPhotos.FromAPhone());
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    /// <summary>Posts a message with a photo, and with text when given, under a new client message id or the one given.</summary>
    public static Task<HttpResponseMessage> SendPhotoMessageAsync(
        this HttpClient member, Guid popkinId, Guid threadId, Guid? photoId, string? text = null, Guid? clientMessageId = null) =>
        member.PostAsJsonAsync(
            $"/api/popkins/{popkinId}/threads/{threadId}/messages", new { clientMessageId = clientMessageId ?? Guid.NewGuid(), text, photoId });

    /// <summary>Uploads a photo and sends it in a message that must be stored, and returns the message.</summary>
    public static async Task<JsonElement> SentPhotoMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, string? text = null)
    {
        var photoId = await member.UploadedThreadPhotoIdAsync(popkinId, threadId);
        var response = await member.SendPhotoMessageAsync(popkinId, threadId, photoId, text);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static int PhotoCount(this ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Count();
    }
}
