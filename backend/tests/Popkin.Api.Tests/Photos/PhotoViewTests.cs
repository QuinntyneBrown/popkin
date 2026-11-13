using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>GET /api/popkins/{popkinId}/photos/{photoId}: one photo, for the photo view (L2-033, L2-036 AC2, L2-051).</summary>
public sealed class PhotoViewTests
{
    private static readonly TimeSpan Minute = TimeSpan.FromMinutes(1);

    private static async Task<(StartedPopkin Lakeside, HttpClient Joel)> LakesideWithJoel(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        return (lakeside, joel);
    }

    // Given a photo a member added with a caption,
    // when another member opens it,
    // then they read who added it and when, its caption, the whole display image at an expiring
    // address with its size, no reactions and no comments yet.
    [Fact]
    public async Task A_member_reads_a_photo()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await LakesideWithJoel(api);
        var taken = api.Clock.GetUtcNow().AddHours(-3);
        var added = await lakeside.Host.AddedPhotoAsync(
            lakeside.Id, TestPhotos.FromAPhone(taken.ToString("yyyy:MM:dd HH:mm:ss"), width: 3000, height: 2000), "First light on the dock.");
        var addedAt = api.Clock.GetUtcNow();

        var photo = await joel.PhotoAsync(lakeside.Id, added.GetProperty("id").GetGuid());

        Assert.Equal(
            ["addedAt", "canDelete", "caption", "commentCount", "height", "id", "imageUrl", "isMine", "nextPhotoId", "previousPhotoId", "reactions", "takenAt", "uploader", "width"],
            photo.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(added.GetProperty("id").GetGuid(), photo.GetProperty("id").GetGuid());
        var uploader = photo.GetProperty("uploader");
        Assert.Equal(["avatar", "displayName", "firstName", "membershipId"], uploader.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Mara", uploader.GetProperty("firstName").GetString());
        Assert.Equal("Mara Okafor", uploader.GetProperty("displayName").GetString());
        Assert.Equal("MO", uploader.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(added.GetProperty("uploader").GetProperty("membershipId").GetGuid(), uploader.GetProperty("membershipId").GetGuid());
        Assert.Equal(addedAt, photo.GetProperty("addedAt").GetDateTimeOffset());
        Assert.Equal(taken, photo.GetProperty("takenAt").GetDateTimeOffset());
        Assert.Equal("First light on the dock.", photo.GetProperty("caption").GetString());
        Assert.Equal((2048, 1365), (photo.GetProperty("width").GetInt32(), photo.GetProperty("height").GetInt32()));
        Assert.Equal(0, photo.GetProperty("reactions").GetArrayLength());
        Assert.Equal(0, photo.GetProperty("commentCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, photo.GetProperty("previousPhotoId").ValueKind);
        Assert.Equal(JsonValueKind.Null, photo.GetProperty("nextPhotoId").ValueKind);
        Assert.False(photo.GetProperty("isMine").GetBoolean());

        var image = await joel.GetAsync(photo.GetProperty("imageUrl").GetString());
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/jpeg", image.Content.Headers.ContentType?.MediaType);
        using var display = new MagickImage(await image.Content.ReadAsByteArrayAsync());
        Assert.Equal((2048u, 1365u), (display.Width, display.Height));
        Assert.Null(display.GetExifProfile());
    }

    // Given an album of three photos by two members,
    // when a member opens each,
    // then "previous" is the newer neighbour and "next" the older one in the whole album's order,
    // and there is none past either end (L2-033 AC3).
    [Fact]
    public async Task A_photo_names_its_neighbours_in_the_album()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await LakesideWithJoel(api);
        var oldest = (await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 1, Minute))[0];
        var middle = (await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 1, Minute))[0];
        var newest = (await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 1, Minute))[0];

        Assert.Equal((null, middle), Neighbours(await joel.PhotoAsync(lakeside.Id, newest)));
        Assert.Equal((newest, oldest), Neighbours(await joel.PhotoAsync(lakeside.Id, middle)));
        Assert.Equal((middle, null), Neighbours(await joel.PhotoAsync(lakeside.Id, oldest)));
    }

    // Given photos all taken in the same second,
    // when a member walks from the first by "next" to the end,
    // then the walk passes every photo once, in the order the album lists them.
    [Fact]
    public async Task The_neighbours_follow_the_order_of_the_album_among_photos_of_one_moment()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await LakesideWithJoel(api);
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 5, TimeSpan.Zero);
        var album = (await joel.AlbumAsync(lakeside.Id)).PhotoIds();

        var walked = new List<Guid>();
        Guid? previous = null;
        for (Guid? id = album[0]; id is not null;)
        {
            var photo = await joel.PhotoAsync(lakeside.Id, id.Value);
            Assert.Equal(previous, Neighbours(photo).Previous);
            walked.Add(id.Value);
            previous = id;
            id = Neighbours(photo).Next;
        }

        Assert.Equal(album, walked);
    }

    // Given a photo by one member,
    // when its uploader, the Host and another member open it,
    // then the uploader and the Host may delete it and the other member may not (L2-036 AC2).
    [Fact]
    public async Task The_uploader_and_the_Host_may_delete_a_photo()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await LakesideWithJoel(api);
        var walt = await api.SignedUpAsync("Walt Chen", "(415) 555-0177");
        await walt.JoinAsync(lakeside.Code, "Walt Chen");
        var joels = (await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 1, Minute))[0];

        var asJoel = await joel.PhotoAsync(lakeside.Id, joels);
        var asHost = await lakeside.Host.PhotoAsync(lakeside.Id, joels);
        var asWalt = await walt.PhotoAsync(lakeside.Id, joels);

        Assert.Equal((true, true), (asJoel.GetProperty("canDelete").GetBoolean(), asJoel.GetProperty("isMine").GetBoolean()));
        Assert.Equal((true, false), (asHost.GetProperty("canDelete").GetBoolean(), asHost.GetProperty("isMine").GetBoolean()));
        Assert.Equal((false, false), (asWalt.GetProperty("canDelete").GetBoolean(), asWalt.GetProperty("isMine").GetBoolean()));
    }

    // Given a member of one Popkin,
    // when they ask it for a photo it does not hold, one of another Popkin included,
    // then 404 photo_not_found; a person who is not a member gets 404 popkin_not_found for any photo,
    // and no session gets 401 (L2-051 AC1, AC3).
    [Fact]
    public async Task A_photo_is_read_only_in_its_own_Popkin_and_only_by_a_member()
    {
        using var api = new ApiFactory();
        var (lakeside, _) = await LakesideWithJoel(api);
        var lakesides = (await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 1, Minute))[0];
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var bookClubs = (await api.AddPhotosAsync(bookClubId, "Sam Ortega", 1, Minute))[0];

        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos/{Guid.NewGuid()}")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos/{bookClubs}")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await sam.GetAsync($"/api/popkins/{bookClubId}/photos/{lakesides}")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await sam.GetAsync($"/api/popkins/{lakeside.Id}/photos/{lakesides}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await sam.GetAsync($"/api/popkins/{lakeside.Id}/photos/{Guid.NewGuid()}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/photos/{lakesides}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos/{lakesides}")).StatusCode);
    }

    // Given a photo's addresses as a member was given them,
    // when the key is asked for without its signature, the signature is changed, or an hour has passed,
    // then nothing is read; a fresh read of the photo gives an address that works again (L2-051 AC2, L2-033 AC4).
    [Fact]
    public async Task A_photos_addresses_expire_and_cannot_be_guessed()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await LakesideWithJoel(api);
        var added = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone());
        var id = added.GetProperty("id").GetGuid();
        var imageUrl = (await joel.PhotoAsync(lakeside.Id, id)).GetProperty("imageUrl").GetString()!;
        var thumbnailUrl = added.GetProperty("thumbnailUrl").GetString()!;
        var anyone = api.CreateBrowserClient();

        Assert.NotEqual(imageUrl.Split('?')[0], thumbnailUrl.Split('?')[0]);
        foreach (var url in new[] { imageUrl, thumbnailUrl })
        {
            Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync(url)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync(url.Split('?')[0])).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync(url[..^4] + "AAAA")).StatusCode);
        }

        // The signature of one file does not open the other.
        Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync(imageUrl.Split('?')[0] + "?" + thumbnailUrl.Split('?')[1])).StatusCode);

        api.Clock.Advance(TimeSpan.FromHours(1));

        await (await joel.GetAsync(imageUrl)).AssertProblem(HttpStatusCode.NotFound, "file_not_found");
        await (await joel.GetAsync(thumbnailUrl)).AssertProblem(HttpStatusCode.NotFound, "file_not_found");
        var again = (await joel.PhotoAsync(lakeside.Id, id)).GetProperty("imageUrl").GetString()!;
        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync(again)).StatusCode);
    }

    private static (Guid? Previous, Guid? Next) Neighbours(JsonElement photo) =>
        (IdOrNull(photo.GetProperty("previousPhotoId")), IdOrNull(photo.GetProperty("nextPhotoId")));

    private static Guid? IdOrNull(JsonElement value) => value.ValueKind == JsonValueKind.Null ? null : value.GetGuid();
}
