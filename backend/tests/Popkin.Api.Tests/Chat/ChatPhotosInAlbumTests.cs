using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.WrapUp;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// Which photos of chat land in Photos (L2-026 AC3): a photo sent in Everyone joins the album
/// under its sender when its message is sent; a photo of a direct message never does, and is
/// counted, listed and exported nowhere (L2-023, L2-051).
/// </summary>
public sealed class ChatPhotosInAlbumTests
{
    /// <summary>Mara, Walt and Ruth in Lakeside, with the direct message between Mara and Walt.</summary>
    private sealed record Cast(StartedPopkin Lakeside, Guid EveryoneId, Guid DirectId, HttpClient Walt, HttpClient Ruth)
    {
        public Guid Id => Lakeside.Id;

        public HttpClient Mara => Lakeside.Host;
    }

    private static async Task<Cast> CastAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        return new Cast(lakeside, everyoneId, directId, walt, ruth);
    }

    // Given a photo Walt uploaded for Everyone,
    // when he has not sent it, then the album and the home's summary hold nothing;
    // when he sends it, then Ruth, with Popkin open, hears PhotosAdded with its id, and the album
    // and the summary hold it, under Walt.
    [Fact]
    public async Task An_Everyone_photo_joins_the_album_under_its_sender_when_its_message_is_sent()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        await using var ruthHub = await api.CreateHubConnectionAsync(cast.Ruth);
        var photoId = await cast.Walt.UploadedThreadPhotoIdAsync(cast.Id, cast.EveryoneId);

        Assert.Equal(0, (await cast.Ruth.AlbumAsync(cast.Id)).GetProperty("photoCount").GetInt32());
        Assert.Equal(0, (await PhotosSummaryAsync(cast.Ruth, cast.Id)).GetProperty("count").GetInt32());

        var sent = await cast.Walt.SendPhotoMessageAsync(cast.Id, cast.EveryoneId, photoId, "Dock was glass this morning");

        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);
        var added = await ruthHub.WaitForAsync("PhotosAdded", timeout: TimeSpan.FromSeconds(1));
        Assert.Equal(cast.Id, added.Arguments[0].GetGuid());
        Assert.Equal([photoId], added.Arguments[1].EnumerateArray().Select(id => id.GetGuid()));
        var album = await cast.Ruth.AlbumAsync(cast.Id);
        Assert.Equal([photoId], album.PhotoIds());
        Assert.Equal("Walt", album.GetProperty("items")[0].GetProperty("uploader").GetProperty("firstName").GetString());
        Assert.Equal(["Walt"], album.GetProperty("contributors").EnumerateArray().Select(c => c.GetProperty("firstName").GetString()));
        var summary = await PhotosSummaryAsync(cast.Ruth, cast.Id);
        Assert.Equal(1, summary.GetProperty("count").GetInt32());
        Assert.Equal(photoId, summary.GetProperty("photos")[0].GetProperty("id").GetGuid());
    }

    // Given a photo Mara sent Walt in their direct message, and one of the album,
    // when anyone reads the album, the home's summary or its photo view's neighbours,
    // then only the album's photo is there, and no PhotosAdded was sent for the direct message's.
    [Fact]
    public async Task A_direct_message_photo_is_never_in_the_album()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        await using var waltHub = await api.CreateHubConnectionAsync(cast.Walt);
        var direct = await cast.Mara.SentPhotoMessageAsync(cast.Id, cast.DirectId, "Just us");
        var albums = (await cast.Mara.AddedPhotoAsync(cast.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();

        await waltHub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == albums);
        Assert.Single(waltHub.ReceivedNamed("PhotosAdded"));
        foreach (var member in new[] { cast.Mara, cast.Walt, cast.Ruth })
        {
            var album = await member.AlbumAsync(cast.Id);
            Assert.Equal([albums], album.PhotoIds());
            Assert.Equal(1, album.GetProperty("photoCount").GetInt32());
            var summary = await PhotosSummaryAsync(member, cast.Id);
            Assert.Equal(1, summary.GetProperty("count").GetInt32());
            Assert.Equal([albums], summary.GetProperty("photos").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()));
        }

        Assert.Equal([albums], (await cast.Mara.AlbumAsync(cast.Id, "filter=mine")).PhotoIds());
        var view = await cast.Mara.PhotoAsync(cast.Id, albums);
        Assert.Equal(JsonValueKind.Null, view.GetProperty("previousPhotoId").ValueKind);
        Assert.Equal(JsonValueKind.Null, view.GetProperty("nextPhotoId").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, direct.GetProperty("photo").ValueKind);
    }

    // Given a wrapped-up Popkin with a photo of the album, an Everyone photo that was sent, one
    // that was uploaded and never sent, and a direct message's photo,
    // when its members read the recap and My Popkins and save the album,
    // then each counts two photos and the zip holds two.
    [Fact]
    public async Task The_recap_My_Popkins_and_the_export_leave_out_what_is_not_in_the_album()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        await cast.Mara.AddedPhotoAsync(cast.Id, TestPhotos.FromAPhone());
        await cast.Walt.SentPhotoMessageAsync(cast.Id, cast.EveryoneId);
        await cast.Walt.UploadedThreadPhotoIdAsync(cast.Id, cast.EveryoneId);
        await cast.Walt.SentPhotoMessageAsync(cast.Id, cast.DirectId);
        await cast.Mara.WrappedUpAsync(cast.Id);

        var recap = await cast.Ruth.ReadRecapAsync(cast.Id);
        Assert.Equal(2, recap.GetProperty("photoCount").GetInt32());
        Assert.Equal(2, recap.GetProperty("photos").GetArrayLength());
        var mine = await cast.Ruth.GetFromJsonAsync<JsonElement>("/api/popkins");
        Assert.Equal(2, mine.GetProperty("wrappedUp")[0].GetProperty("photoCount").GetInt32());

        var started = await cast.Ruth.PostAsync($"/api/popkins/{cast.Id}/recap/album-exports", null);
        var export = await started.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, export.GetProperty("photosTotal").GetInt32());
        await api.SendAsync(new PrepareAlbumExportsCommand());
        var ready = await cast.Ruth.GetFromJsonAsync<JsonElement>($"/api/popkins/{cast.Id}/recap/album-exports/{export.GetProperty("id").GetGuid()}");
        var download = await cast.Ruth.GetAsync(ready.GetProperty("downloadUrl").GetString());
        using var zip = new ZipArchive(await download.Content.ReadAsStreamAsync());
        Assert.Equal(2, zip.Entries.Count);
    }

    // Given a Popkin wrapped up without its album, with an Everyone photo and a direct message's
    // photo sent, when its photos are removed 30 days later (L2-045 AC4),
    // then the files of both are gone, their messages show no photo, and the recap still counts
    // the one photo the album held.
    [Fact]
    public async Task The_photos_of_chat_go_with_an_album_that_was_not_kept()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        await cast.Walt.SentPhotoMessageAsync(cast.Id, cast.EveryoneId, "Dock");
        await cast.Walt.SentPhotoMessageAsync(cast.Id, cast.DirectId, "Just us");
        await cast.Mara.WrappedUpAsync(cast.Id, keepPhotos: false);
        api.Clock.Advance(TimeSpan.FromDays(30));

        await api.SendAsync(new RemoveWrappedUpAlbumsCommand());
        await cast.Mara.SignInAgainAsync(api, "(415) 555-0148");

        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, api.PhotoCount());
        Assert.Equal(1, (await cast.Mara.ReadRecapAsync(cast.Id)).GetProperty("photoCount").GetInt32());
        foreach (var threadId in new[] { cast.EveryoneId, cast.DirectId })
        {
            var sent = (await cast.Mara.MessagesAsync(cast.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.GetProperty("kind").GetString() == "Member");
            Assert.Equal(JsonValueKind.Null, sent.GetProperty("photo").ValueKind);
        }
    }

    private static Task<JsonElement> PhotosSummaryAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/photos/summary");
}
