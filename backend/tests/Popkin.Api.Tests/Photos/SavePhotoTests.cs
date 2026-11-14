using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// GET /api/popkins/{popkinId}/photos/{photoId}/download: "Save photo" downloads the photo at the
/// size it was added (L2-036 AC1), from an address that expires (L2-051 AC2), in a wrapped-up
/// Popkin too (L2-045 AC3).
/// </summary>
public sealed class SavePhotoTests
{
    // Given a photo Mara added, taken on 14 June 2026 at 07:40,
    // when Joel asks to save it, then 200 with an address and when it expires, an hour on;
    // and the address answers the stored photo, the same bytes the photo view shows, as an
    // attachment named popkin-photo-20260614-0740.jpg;
    // and an hour later the address no longer works.
    [Fact]
    public async Task A_member_saves_the_photo_as_it_was_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone("2026:06:14 07:40:12"))).GetProperty("id").GetGuid();

        var response = await joel.PhotoDownloadAsync(lakeside.Id, photoId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var download = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["expiresAt", "url"], download.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(api.Clock.GetUtcNow().AddHours(1), download.GetProperty("expiresAt").GetDateTimeOffset());
        var file = await joel.GetAsync(download.GetProperty("url").GetString());
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("attachment", file.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Equal("popkin-photo-20260614-0740.jpg", file.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        Assert.Equal("image/jpeg", file.Content.Headers.ContentType?.MediaType);
        var shown = await joel.GetByteArrayAsync((await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("imageUrl").GetString());
        Assert.Equal(shown, await file.Content.ReadAsByteArrayAsync());

        api.Clock.Advance(TimeSpan.FromHours(1));
        Assert.Equal(HttpStatusCode.NotFound, (await joel.GetAsync(download.GetProperty("url").GetString())).StatusCode);
    }

    // Given a photo with no capture time, added at a known moment, when it is saved, then its file is named after when it was added.
    [Fact]
    public async Task A_photo_without_a_capture_time_is_named_after_when_it_was_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        var addedAt = api.Clock.GetUtcNow();

        var download = await (await lakeside.Host.PhotoDownloadAsync(lakeside.Id, photoId)).Content.ReadFromJsonAsync<JsonElement>();
        var file = await lakeside.Host.GetAsync(download.GetProperty("url").GetString());

        Assert.Equal($"popkin-photo-{addedAt:yyyyMMdd-HHmm}.jpg", file.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
    }

    // Given Lakeside wrapped up keeping its album, when Mara saves a photo, then she gets it.
    [Fact]
    public async Task A_photo_is_saved_from_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        var response = await lakeside.Host.PhotoDownloadAsync(lakeside.Id, photoId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var url = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("url").GetString();
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync(url)).StatusCode);
    }

    // Given a photo Mara sent Walt in their direct message and one in the album,
    // when Walt saves the direct message's, then he gets it;
    // when Ruth, a third member, asks for it, then 404 photo_not_found;
    // when someone who is not a member asks for the album's, then 404 popkin_not_found.
    [Fact]
    public async Task Only_those_who_may_see_a_photo_save_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var stranger = await api.SignedUpAsync("Sam", "(415) 555-0177");
        var albumPhotoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var directPhotoId = (await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId, "Just us")).PhotoIdOf();

        Assert.Equal(HttpStatusCode.OK, (await walt.PhotoDownloadAsync(lakeside.Id, directPhotoId)).StatusCode);
        await (await ruth.PhotoDownloadAsync(lakeside.Id, directPhotoId)).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await stranger.PhotoDownloadAsync(lakeside.Id, albumPhotoId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
