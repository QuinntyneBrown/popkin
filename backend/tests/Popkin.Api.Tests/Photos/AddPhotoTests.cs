using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>POST /api/popkins/{popkinId}/photos: a member adds a photo to the album (L2-031, L2-051 AC1, L2-055 AC4).</summary>
public sealed class AddPhotoTests
{
    // Given a member of an active Popkin,
    // when they add a photo with a caption,
    // then 201 answers the photo as the album shows it, with a Location of the photo,
    // and a display image and a thumbnail are stored for it.
    [Fact]
    public async Task A_member_adds_a_photo_to_the_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var now = api.Clock.GetUtcNow();

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000), "  First light on the dock.  ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = photo.GetProperty("id").GetGuid();
        Assert.Equal($"/api/popkins/{lakeside.Id}/photos/{id}", response.Headers.Location?.OriginalString);
        Assert.Equal("First light on the dock.", photo.GetProperty("caption").GetString());
        Assert.Equal("Mara", photo.GetProperty("uploader").GetProperty("firstName").GetString());
        Assert.Equal("MO", photo.GetProperty("uploader").GetProperty("avatar").GetProperty("initials").GetString());
        Assert.NotEqual(Guid.Empty, photo.GetProperty("uploader").GetProperty("membershipId").GetGuid());
        Assert.Equal(now, photo.GetProperty("addedAt").GetDateTimeOffset());
        Assert.Equal(now, photo.GetProperty("takenAt").GetDateTimeOffset());
        Assert.True(photo.GetProperty("isMine").GetBoolean());
        // The display image is no longer than 2048 px on its longest edge; the answer gives its size.
        Assert.Equal(2048, photo.GetProperty("width").GetInt32());
        Assert.Equal(1365, photo.GetProperty("height").GetInt32());
        Assert.Equal(
            ["addedAt", "caption", "height", "id", "isMine", "takenAt", "thumbnailUrl", "uploader", "width"],
            photo.EnumerateObject().Select(p => p.Name).Order());

        var thumbnail = await lakeside.Host.GetAsync(photo.GetProperty("thumbnailUrl").GetString());
        Assert.Equal(HttpStatusCode.OK, thumbnail.StatusCode);
        Assert.Equal("image/jpeg", thumbnail.Content.Headers.ContentType?.MediaType);
        using var small = new MagickImage(await thumbnail.Content.ReadAsByteArrayAsync());
        Assert.Equal((480u, 320u), (small.Width, small.Height));
        // Three files are kept for a photo, the thumbnail, the display image and the photo at the
        // size it was added, for "Save photo" (L2-036 AC1), and not the upload itself.
        Assert.Equal([(480u, 320u), (2048u, 1365u), (3000u, 2000u)], StoredSizes(api));
    }

    // Given a small photo and no caption,
    // when a member adds it,
    // then it is not enlarged and its caption is null; a caption of white space is none.
    [Fact]
    public async Task A_small_photo_is_not_enlarged_and_a_caption_is_optional()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var photo = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 400, 300));
        var blank = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 400, 300), "   ");

        Assert.Equal(JsonValueKind.Null, photo.GetProperty("caption").ValueKind);
        Assert.Equal(JsonValueKind.Null, blank.GetProperty("caption").ValueKind);
        Assert.Equal((400, 300), (photo.GetProperty("width").GetInt32(), photo.GetProperty("height").GetInt32()));
        Assert.All(StoredSizes(api), size => Assert.Equal((400u, 300u), size));
    }

    public static TheoryData<string, byte[]> AllowedPhotos => new()
    {
        { "PNG", TestPhotos.WithLocation(MagickFormat.Png) },
        { "WebP", TestPhotos.WithLocation(MagickFormat.WebP) },
        { "HEIC", TestPhotos.Heic() },
    };

    // Given a PNG, a WebP or a HEIC photo under any name and declared type,
    // when a member adds it, then it is stored, as JPEG renditions every browser shows.
    [Theory]
    [MemberData(nameof(AllowedPhotos))]
    public async Task A_PNG_WebP_or_HEIC_photo_is_added_whatever_the_file_is_called(string type, byte[] file)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, file, fileName: "photo.bin", contentType: "application/octet-stream");

        Assert.True(response.StatusCode == HttpStatusCode.Created, $"{type}: {response.StatusCode}");
        Assert.Equal(3, api.Photos.Files.Count);
        Assert.All(api.Photos.Files.Values, f =>
        {
            using var stored = new MagickImage(f.Content);
            Assert.Equal(MagickFormat.Jpeg, stored.Format);
            Assert.Equal("image/jpeg", f.ContentType);
        });
    }

    // Given a signed-in person who is not a member, or no session,
    // when they add a photo to a Popkin, or to one that does not exist,
    // then 404 popkin_not_found, or 401, and nothing is stored (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_adds_a_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var file = TestPhotos.WithLocation(MagickFormat.Jpeg);

        await (await stranger.AddPhotoAsync(lakeside.Id, file)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.AddPhotoAsync(Guid.NewGuid(), file)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().AddPhotoAsync(lakeside.Id, file)).StatusCode);
        Assert.Empty(api.Photos.Files);
    }

    // Given a member who is not the Host,
    // when they add a photo, then it is theirs, under their name.
    [Fact]
    public async Task Any_member_adds_a_photo_under_their_own_name()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");

        var photo = await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Png), "Canoe race");

        Assert.Equal("Joel", photo.GetProperty("uploader").GetProperty("firstName").GetString());
        Assert.True(photo.GetProperty("isMine").GetBoolean());
    }

    private static List<(uint Width, uint Height)> StoredSizes(ApiFactory api) =>
        api.Photos.Files.Values
            .Select(f =>
            {
                using var image = new MagickImage(f.Content);
                return (image.Width, image.Height);
            })
            .Order()
            .ToList();
}
