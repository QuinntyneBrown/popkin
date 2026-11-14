using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// Deleting one's own photo message (L2-024): an Everyone photo stays in the album it joined; a
/// direct message's photo goes from the photo store with its message.
/// </summary>
public sealed class DeletePhotoMessageTests
{
    // Given Walt's photo message in Everyone, whose photo joined the album,
    // when he deletes the message, then the photo stays in the album and still opens.
    [Fact]
    public async Task An_Everyone_photo_stays_in_the_album_when_its_message_is_deleted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        var sent = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId, "Dock");
        var photoId = sent.GetProperty("photo").GetProperty("id").GetGuid();

        var deleted = await walt.DeleteMessageAsync(lakeside.Id, everyoneId, sent.GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal([photoId], (await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds());
        var view = await lakeside.Host.PhotoAsync(lakeside.Id, photoId);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync(view.GetProperty("imageUrl").GetString())).StatusCode);
        Assert.Equal(2, api.Photos.Files.Count);
    }

    // Given Mara's photo message in her direct message with Walt,
    // when she deletes the message, then its photo and both its files are gone: the photo view
    // and the address the message gave answer 404 to both.
    [Fact]
    public async Task A_direct_message_photo_goes_with_its_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var sent = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId, "Just us");
        var photo = sent.GetProperty("photo");
        var photoId = photo.GetProperty("id").GetGuid();

        var deleted = await lakeside.Host.DeleteMessageAsync(lakeside.Id, directId, sent.GetProperty("id").GetGuid());

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, api.PhotoCount());
        foreach (var member in new[] { lakeside.Host, walt })
        {
            await (await member.GetAsync($"/api/popkins/{lakeside.Id}/photos/{photoId}")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
            Assert.Equal(HttpStatusCode.NotFound, (await member.GetAsync(photo.GetProperty("url").GetString())).StatusCode);
        }
    }

    // Given a photo message in a direct message that the server stored with its answer lost,
    // when its author deletes it by its client message id (L2-028 AC1), then its photo goes too.
    [Fact]
    public async Task A_discarded_direct_message_photo_goes_with_its_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var photoId = await lakeside.Host.UploadedThreadPhotoIdAsync(lakeside.Id, directId);
        var clientMessageId = Guid.NewGuid();
        (await lakeside.Host.SendPhotoMessageAsync(lakeside.Id, directId, photoId, clientMessageId: clientMessageId)).EnsureSuccessStatusCode();

        var discarded = await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/threads/{directId}/messages/client/{clientMessageId}");

        Assert.Equal(HttpStatusCode.NoContent, discarded.StatusCode);
        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, api.PhotoCount());
    }
}
