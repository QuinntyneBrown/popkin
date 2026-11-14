using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// GET /api/popkins/{popkinId}/photos/{photoId}/download: "Save photo" downloads the photo at the
/// size it was added (L2-036 AC1), from an address that expires (L2-051 AC2), in a wrapped-up
/// Popkin too (L2-045 AC3).
/// </summary>
public sealed class SavePhotoTests
{
    // Given a photo of 3000 by 2000 px that Mara added, taken on 14 June 2026 at 07:40, with its
    // location and the phone's make and model,
    // when Joel asks to save it, then 200 with an address and when it expires, an hour on;
    // and the address answers a JPEG of 3000 by 2000 px, larger than the 2048 px the photo view
    // shows, without its location or device data (L2-031 AC6), as an attachment named
    // popkin-photo-20260614-0740.jpg;
    // and an hour later the address no longer works.
    [Fact]
    public async Task A_member_saves_the_photo_as_it_was_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone("2026:06:14 07:40:12", width: 3000, height: 2000))).GetProperty("id").GetGuid();

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
        using var saved = new MagickImage(await file.Content.ReadAsByteArrayAsync());
        Assert.Equal(MagickFormat.Jpeg, saved.Format);
        Assert.Equal((3000u, 2000u), (saved.Width, saved.Height));
        Assert.Null(saved.GetExifProfile());
        Assert.Null(saved.GetXmpProfile());
        Assert.Equal(2048, (await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("width").GetInt32());

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

    // Given a photo of 3000 by 2000 px Walt sent Mara in their direct message,
    // when Mara saves it, then she gets it at 3000 by 2000 px, without its location or device data.
    [Fact]
    public async Task A_photo_of_chat_is_saved_at_the_size_it_was_sent()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var directId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        var uploaded = await walt.UploadedThreadPhotoIdAsync(lakeside.Id, directId, TestPhotos.FromAPhone(width: 3000, height: 2000));
        (await walt.SendPhotoMessageAsync(lakeside.Id, directId, uploaded)).EnsureSuccessStatusCode();

        var download = await (await lakeside.Host.PhotoDownloadAsync(lakeside.Id, uploaded)).Content.ReadFromJsonAsync<JsonElement>();

        using var saved = new MagickImage(await lakeside.Host.GetByteArrayAsync(download.GetProperty("url").GetString()));
        Assert.Equal((3000u, 2000u), (saved.Width, saved.Height));
        Assert.Null(saved.GetExifProfile());
    }

    // Given a photo stored before Popkin kept the size it was added, with its display image only,
    // when Mara saves it, then she gets its display image, the same bytes the photo view shows.
    [Fact]
    public async Task A_photo_stored_without_its_original_size_is_saved_as_its_display_image()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(width: 3000, height: 2000))).GetProperty("id").GetGuid();
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var photo = db.Photos.Single(p => p.Id == photoId);
            db.Entry(photo).Property(p => p.OriginalKey).CurrentValue = null;
            await db.SaveChangesAsync();
        }

        var download = await (await lakeside.Host.PhotoDownloadAsync(lakeside.Id, photoId)).Content.ReadFromJsonAsync<JsonElement>();

        var shown = await lakeside.Host.GetByteArrayAsync((await lakeside.Host.PhotoAsync(lakeside.Id, photoId)).GetProperty("imageUrl").GetString());
        Assert.Equal(shown, await lakeside.Host.GetByteArrayAsync(download.GetProperty("url").GetString()));
    }
}
