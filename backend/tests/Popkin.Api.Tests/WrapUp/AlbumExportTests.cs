using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;
using Popkin.Application.WrapUp;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// "Save the album" (L2-046 AC4): POST and GET /api/popkins/{popkinId}/recap/album-exports, and
/// `PrepareAlbumExportsCommand`, which the Worker sends, reached here through MediatR.
/// </summary>
public sealed class AlbumExportTests
{
    private static Task<HttpResponseMessage> StartExportAsync(HttpClient member, Guid popkinId) =>
        member.PostAsync($"/api/popkins/{popkinId}/recap/album-exports", null);

    private static async Task<JsonElement> StartedExportAsync(HttpClient member, Guid popkinId)
    {
        var response = await StartExportAsync(member, popkinId);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static Task<JsonElement> ExportAsync(HttpClient member, Guid popkinId, Guid exportId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/recap/album-exports/{exportId}");

    /// <summary>Lakeside with Joel and two photos whose files are in the store, wrapped up.</summary>
    private static async Task<(StartedPopkin Lakeside, HttpClient Joel)> WrappedUpWithTwoPhotosAsync(ApiFactory api, bool keepPhotos = true)
    {
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 400, 300));
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 300, 400));
        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos);
        return (lakeside, joel);
    }

    // Given a wrapped-up Popkin with two photos,
    // when a member chooses to save the album,
    // then 202 with an export that is being prepared, none of its two photos done, no address yet, and where to follow it.
    [Fact]
    public async Task A_member_asks_for_the_album_and_it_starts_being_prepared()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await WrappedUpWithTwoPhotosAsync(api);

        var response = await StartExportAsync(joel, lakeside.Id);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var export = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Preparing", export.GetProperty("status").GetString());
        Assert.Equal(0, export.GetProperty("photosDone").GetInt32());
        Assert.Equal(2, export.GetProperty("photosTotal").GetInt32());
        Assert.Equal(JsonValueKind.Null, export.GetProperty("downloadUrl").ValueKind);
        Assert.Equal(["downloadUrl", "id", "photosDone", "photosTotal", "status"], export.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal($"/api/popkins/{lakeside.Id}/recap/album-exports/{export.Id()}", response.Headers.Location?.OriginalString);
        Assert.Equal("Preparing", (await ExportAsync(joel, lakeside.Id, export.Id())).GetProperty("status").GetString());
    }

    // Given an export being prepared,
    // when the Worker's tick prepares it,
    // then it is ready with every photo done, and its address downloads a zip named after the
    // Popkin that holds each photo's display image, oldest first.
    [Fact]
    public async Task A_prepared_export_downloads_a_zip_of_every_photo()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await WrappedUpWithTwoPhotosAsync(api);
        var displayImages = api.Photos.Files
            .Where(f => f.Key.StartsWith($"popkins/{lakeside.Id:N}/", StringComparison.Ordinal) && !f.Key.Contains("-thumbnail", StringComparison.Ordinal))
            .Select(f => f.Value.Content)
            .ToList();
        var exportId = (await StartedExportAsync(joel, lakeside.Id)).Id();

        var prepared = await api.SendAsync(new PrepareAlbumExportsCommand());

        Assert.Equal(1, prepared);
        var export = await ExportAsync(joel, lakeside.Id, exportId);
        Assert.Equal("Ready", export.GetProperty("status").GetString());
        Assert.Equal(2, export.GetProperty("photosDone").GetInt32());
        Assert.Equal(2, export.GetProperty("photosTotal").GetInt32());
        // The signed address is the proof of the right to read it, so no session is asked for (L2-051 AC2).
        var download = await api.CreateBrowserClient().GetAsync(export.GetProperty("downloadUrl").GetString());
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("application/zip", download.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", download.Content.Headers.ContentDisposition?.DispositionType);
        Assert.Equal("Lakeside Weekend.zip", download.Content.Headers.ContentDisposition?.FileNameStar);
        using var zip = new ZipArchive(await download.Content.ReadAsStreamAsync());
        Assert.Equal(["001.jpg", "002.jpg"], zip.Entries.Select(e => e.FullName));
        var zipped = zip.Entries.Select(e =>
        {
            using var content = e.Open();
            using var bytes = new MemoryStream();
            content.CopyTo(bytes);
            return bytes.ToArray();
        }).ToList();
        Assert.Equal(2, displayImages.Count);
        Assert.All(displayImages, image => Assert.Contains(zipped, z => z.SequenceEqual(image)));
    }

    // Given an export that is being prepared, or is ready and has not expired,
    // when a member asks for the album again, then the same export answers; nothing is prepared twice.
    [Fact]
    public async Task An_export_under_way_or_ready_is_used_again()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await WrappedUpWithTwoPhotosAsync(api);
        var first = (await StartedExportAsync(joel, lakeside.Id)).Id();

        var whilePreparing = await StartedExportAsync(lakeside.Host, lakeside.Id);
        await api.SendAsync(new PrepareAlbumExportsCommand());
        api.Clock.Advance(TimeSpan.FromHours(23));
        var whileReady = await StartedExportAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(first, whilePreparing.Id());
        Assert.Equal(first, whileReady.Id());
        Assert.Equal("Ready", whileReady.GetProperty("status").GetString());
        Assert.StartsWith("/api/files/", whileReady.GetProperty("downloadUrl").GetString());
        Assert.Equal(0, await api.SendAsync(new PrepareAlbumExportsCommand()));
    }

    // Given a ready export that is 24 hours old,
    // when a member asks for the album, then a new export starts; the old one is not found,
    // and the next tick removes its zip from the photo store.
    [Fact]
    public async Task An_export_expires_after_24_hours()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await WrappedUpWithTwoPhotosAsync(api);
        var first = (await StartedExportAsync(joel, lakeside.Id)).Id();
        await api.SendAsync(new PrepareAlbumExportsCommand());
        Assert.Single(api.Photos.Files.Keys, k => k.EndsWith(".zip", StringComparison.Ordinal));
        api.Clock.Advance(TimeSpan.FromHours(24));

        var second = await StartedExportAsync(joel, lakeside.Id);

        Assert.NotEqual(first, second.Id());
        Assert.Equal("Preparing", second.GetProperty("status").GetString());
        await (await joel.GetAsync($"/api/popkins/{lakeside.Id}/recap/album-exports/{first}")).AssertProblem(HttpStatusCode.NotFound, "export_not_found");
        await api.SendAsync(new PrepareAlbumExportsCommand());
        var zip = Assert.Single(api.Photos.Files.Keys, k => k.EndsWith(".zip", StringComparison.Ordinal));
        Assert.Contains(zip, (await ExportAsync(joel, lakeside.Id, second.Id())).GetProperty("downloadUrl").GetString());
    }

    // Given a download address, when it is an hour old or its file name was changed,
    // then it reads nothing: 404 file_not_found (L2-051 AC2).
    [Fact]
    public async Task The_download_address_expires_and_cannot_be_changed()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await WrappedUpWithTwoPhotosAsync(api);
        var exportId = (await StartedExportAsync(joel, lakeside.Id)).Id();
        await api.SendAsync(new PrepareAlbumExportsCommand());
        var address = (await ExportAsync(joel, lakeside.Id, exportId)).GetProperty("downloadUrl").GetString()!;

        var renamed = await joel.GetAsync(address.Replace("Lakeside", "Riverside", StringComparison.Ordinal));
        api.Clock.Advance(TimeSpan.FromHours(1));
        var late = await joel.GetAsync(address);

        Assert.Contains("Lakeside", address);
        await renamed.AssertProblem(HttpStatusCode.NotFound, "file_not_found");
        await late.AssertProblem(HttpStatusCode.NotFound, "file_not_found");
    }

    // Given an album one of whose files the photo store has lost,
    // when the export is prepared, then it has failed, with no address; asking again starts a new one.
    [Fact]
    public async Task An_export_that_cannot_be_prepared_has_failed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        // Photos whose facts are stored and whose files are not.
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, TimeSpan.FromMinutes(1));
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        var exportId = (await StartedExportAsync(lakeside.Host, lakeside.Id)).Id();

        await api.SendAsync(new PrepareAlbumExportsCommand());

        var export = await ExportAsync(lakeside.Host, lakeside.Id, exportId);
        Assert.Equal("Failed", export.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, export.GetProperty("downloadUrl").ValueKind);
        Assert.DoesNotContain(api.Photos.Files.Keys, k => k.EndsWith(".zip", StringComparison.Ordinal));
        Assert.NotEqual(exportId, (await StartedExportAsync(lakeside.Host, lakeside.Id)).Id());
    }

    // Given an active Popkin, then 409 popkin_active; given someone who is not a member, 404 popkin_not_found;
    // given an export that does not exist or is another Popkin's, 404 export_not_found (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_of_a_wrapped_up_Popkin_saves_its_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await sam.WrappedUpAsync(bookClubId);

        await (await StartExportAsync(lakeside.Host, lakeside.Id)).AssertProblem(HttpStatusCode.Conflict, "popkin_active");
        await (await StartExportAsync(sam, lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        var exportId = (await StartedExportAsync(lakeside.Host, lakeside.Id)).Id();

        await (await StartExportAsync(sam, lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await sam.GetAsync($"/api/popkins/{lakeside.Id}/recap/album-exports/{exportId}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await sam.GetAsync($"/api/popkins/{bookClubId}/recap/album-exports/{exportId}")).AssertProblem(HttpStatusCode.NotFound, "export_not_found");
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/recap/album-exports/{Guid.NewGuid()}"))
            .AssertProblem(HttpStatusCode.NotFound, "export_not_found");
    }
}
