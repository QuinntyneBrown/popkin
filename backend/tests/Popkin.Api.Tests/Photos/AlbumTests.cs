using System.Net;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>GET /api/popkins/{popkinId}/photos: the album, a page at a time (L2-032, L2-045 AC3, L2-051 AC1, L2-052 AC1).</summary>
public sealed class AlbumTests
{
    private static readonly TimeSpan Minute = TimeSpan.FromMinutes(1);

    private static async Task<StartedPopkin> LakesideWith(ApiFactory api, params string[] members)
    {
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        await api.AddMembersAsync(lakeside.Id, members);
        return lakeside;
    }

    // Given an album two members have added to,
    // when a member reads it,
    // then it counts the photos and the people, shows the latest contributors first,
    // lists the photos latest taken first, and says the member may add.
    [Fact]
    public async Task A_member_reads_the_album_latest_first()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api, "Joel Ferreira");
        var maras = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, Minute);
        var joels = await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 1, Minute);

        var album = await lakeside.Host.AlbumAsync(lakeside.Id);

        Assert.Equal(
            ["canAdd", "contributorCount", "contributors", "items", "nextCursor", "photoCount"],
            album.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(3, album.GetProperty("photoCount").GetInt32());
        Assert.Equal(2, album.GetProperty("contributorCount").GetInt32());
        Assert.Equal(["Joel", "Mara"], album.GetProperty("contributors").EnumerateArray().Select(c => c.GetProperty("firstName").GetString()));
        var joel = album.GetProperty("contributors")[0];
        Assert.Equal(["avatar", "firstName"], joel.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("JF", joel.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal([joels[0], maras[1], maras[0]], album.PhotoIds());
        Assert.Equal(JsonValueKind.Null, album.GetProperty("nextCursor").ValueKind);
        Assert.True(album.GetProperty("canAdd").GetBoolean());

        var first = album.GetProperty("items")[0];
        Assert.Equal(
            ["addedAt", "caption", "height", "id", "isMine", "takenAt", "thumbnailUrl", "uploader", "width"],
            first.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Photo 1 by Joel Ferreira", first.GetProperty("caption").GetString());
        Assert.Equal("Joel", first.GetProperty("uploader").GetProperty("firstName").GetString());
        Assert.False(first.GetProperty("isMine").GetBoolean());
        Assert.True(album.GetProperty("items")[1].GetProperty("isMine").GetBoolean());
        Assert.StartsWith("/api/files/", first.GetProperty("thumbnailUrl").GetString());
    }

    // Given a photo taken last week and added today, after photos taken and added yesterday,
    // when a member reads the album,
    // then it comes after them: the album follows when a photo was taken, not when it was added.
    [Fact]
    public async Task The_album_follows_when_a_photo_was_taken()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);
        var yesterdays = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, Minute);
        api.Clock.Advance(TimeSpan.FromDays(1));
        var lastWeek = api.Clock.GetUtcNow().AddDays(-7).ToString("yyyy:MM:dd HH:mm:ss");

        var old = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(lastWeek), "From last week");

        var album = await lakeside.Host.AlbumAsync(lakeside.Id);
        Assert.Equal([yesterdays[1], yesterdays[0], old.GetProperty("id").GetGuid()], album.PhotoIds());
    }

    // Given an album five members have added to, one of them again after the others,
    // when a member reads it,
    // then every contributor is counted and the four who added most recently are shown, latest first.
    [Fact]
    public async Task The_album_shows_its_four_most_recent_contributors()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api, "Joel Ferreira", "Priya Nair", "Sam Ortega", "Walt Chen", "Dee Moss");
        foreach (var name in new[] { "Mara Okafor", "Joel Ferreira", "Priya Nair", "Sam Ortega", "Walt Chen" })
        {
            await api.AddPhotosAsync(lakeside.Id, name, 2, Minute);
        }

        await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 1, Minute);

        var album = await lakeside.Host.AlbumAsync(lakeside.Id);

        Assert.Equal(11, album.GetProperty("photoCount").GetInt32());
        Assert.Equal(5, album.GetProperty("contributorCount").GetInt32());
        Assert.Equal(
            ["Joel", "Walt", "Sam", "Priya"],
            album.GetProperty("contributors").EnumerateArray().Select(c => c.GetProperty("firstName").GetString()));
    }

    // Given an album with photos by two members,
    // when one reads it with the filter "mine",
    // then only their photos are listed, while the counts and contributors stay those of the whole album;
    // a member who has added none gets an empty list.
    [Fact]
    public async Task Mine_lists_only_the_members_own_photos()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        var walt = await api.SignedUpAsync("Walt Chen", "(415) 555-0177");
        await walt.JoinAsync(lakeside.Code, "Walt Chen");
        var maras = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, Minute);
        var joels = await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 3, Minute);

        var mine = await joel.AlbumAsync(lakeside.Id, "filter=mine");
        var everyone = await joel.AlbumAsync(lakeside.Id, "filter=everyone");
        var none = await walt.AlbumAsync(lakeside.Id, "filter=mine");

        Assert.Equal([joels[2], joels[1], joels[0]], mine.PhotoIds());
        Assert.All(mine.GetProperty("items").EnumerateArray(), p => Assert.True(p.GetProperty("isMine").GetBoolean()));
        Assert.Equal(5, mine.GetProperty("photoCount").GetInt32());
        Assert.Equal(2, mine.GetProperty("contributorCount").GetInt32());
        Assert.Equal(2, mine.GetProperty("contributors").GetArrayLength());
        Assert.Equal([joels[2], joels[1], joels[0], maras[1], maras[0]], everyone.PhotoIds());
        Assert.Empty(none.PhotoIds());
        Assert.Equal(5, none.GetProperty("photoCount").GetInt32());
    }

    // Given an album of 61 photos,
    // when a member reads it and then reads from the cursor it gave,
    // then the first page holds 60 and the second the last one, with no photo twice,
    // even when another photo was added between the two reads (L2-032 AC6).
    [Theory]
    [InlineData(60)]
    // Every photo taken in the same second: the order is then decided by id alone.
    [InlineData(0)]
    public async Task A_large_album_is_read_60_photos_at_a_time(int secondsApart)
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);
        var all = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 61, TimeSpan.FromSeconds(secondsApart));

        var first = await lakeside.Host.AlbumAsync(lakeside.Id);
        api.Clock.Advance(Minute);
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 1, TimeSpan.Zero);
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await lakeside.Host.AlbumAsync(lakeside.Id, $"cursor={Uri.EscapeDataString(cursor)}");

        Assert.Equal(60, first.PhotoIds().Count);
        Assert.Single(second.PhotoIds());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
        Assert.Equal(all.Order(), first.PhotoIds().Concat(second.PhotoIds()).Order());
        // The counts are those of the album as it is now.
        Assert.Equal(61, first.GetProperty("photoCount").GetInt32());
        Assert.Equal(62, second.GetProperty("photoCount").GetInt32());
        if (secondsApart > 0)
        {
            Assert.Equal(all.AsEnumerable().Reverse().Take(60), first.PhotoIds());
            Assert.Equal(all[0], second.PhotoIds().Single());
        }
    }

    // Given the filter "mine" in an album two members have added to,
    // when a member pages through it two at a time,
    // then the cursor carries on within the filter.
    [Fact]
    public async Task A_cursor_carries_on_within_the_filter()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api, "Joel Ferreira");
        var maras = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, Minute);
        await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 2, Minute);
        maras.AddRange(await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 1, Minute));

        var first = await lakeside.Host.AlbumAsync(lakeside.Id, "filter=mine&limit=2");
        var second = await lakeside.Host.AlbumAsync(
            lakeside.Id, $"filter=mine&limit=2&cursor={Uri.EscapeDataString(first.GetProperty("nextCursor").GetString()!)}");

        Assert.Equal([maras[2], maras[1]], first.PhotoIds());
        Assert.Equal([maras[0]], second.PhotoIds());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
    }

    // Given an album of 61 photos,
    // when a member asks for a page of a given size,
    // then a size from 1 to 60 is honoured and any other becomes 60.
    [Theory]
    [InlineData("limit=1", 1)]
    [InlineData("limit=59", 59)]
    [InlineData("limit=60", 60)]
    [InlineData("", 60)]
    [InlineData("limit=61", 60)]
    [InlineData("limit=1000", 60)]
    [InlineData("limit=0", 60)]
    [InlineData("limit=-5", 60)]
    public async Task A_page_holds_at_most_60_photos(string query, int expected)
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 61, Minute);

        var album = await lakeside.Host.AlbumAsync(lakeside.Id, query);

        Assert.Equal(expected, album.PhotoIds().Count);
        Assert.Equal(JsonValueKind.String, album.GetProperty("nextCursor").ValueKind);
    }

    // Given a filter that is neither "everyone" nor "mine", or a cursor the album did not give,
    // when a member reads the album, then 400 names the field (L2-052 AC1).
    [Theory]
    [InlineData("filter=theirs", "invalid_filter", "filter")]
    [InlineData("filter=1", "invalid_filter", "filter")]
    [InlineData("cursor=nonsense", "invalid_cursor", "cursor")]
    [InlineData("cursor=!!!", "invalid_cursor", "cursor")]
    [InlineData("cursor=MTIzNDU2Nzg5MA", "invalid_cursor", "cursor")]
    [InlineData("cursor=OTk5OTk5OTk5OTk5OTk5OTk5OTk5Ojk5", "invalid_cursor", "cursor")]
    public async Task An_unknown_filter_or_cursor_is_refused(string query, string code, string field)
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);

        var response = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos?{query}");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, body.GetProperty("field").GetString());
    }

    // The filter is read whatever its case; an empty filter or cursor is the same as none.
    [Theory]
    [InlineData("filter=Mine")]
    [InlineData("filter=EVERYONE")]
    [InlineData("filter=&cursor=")]
    public async Task The_filter_is_read_whatever_its_case(string query)
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);

        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos?{query}")).StatusCode);
    }

    // Given a Popkin with no photos, when a member reads its album, then it is empty and may be added to.
    [Fact]
    public async Task An_album_without_photos_is_empty()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);

        var album = await lakeside.Host.AlbumAsync(lakeside.Id);

        Assert.Equal(0, album.GetProperty("photoCount").GetInt32());
        Assert.Equal(0, album.GetProperty("contributorCount").GetInt32());
        Assert.Equal(0, album.GetProperty("contributors").GetArrayLength());
        Assert.Empty(album.PhotoIds());
        Assert.Equal(JsonValueKind.Null, album.GetProperty("nextCursor").ValueKind);
        Assert.True(album.GetProperty("canAdd").GetBoolean());
    }

    // Given a wrapped-up Popkin with a photo,
    // when a member reads its album, then the photo is there and nothing may be added (L2-045 AC3).
    [Fact]
    public async Task A_wrapped_up_album_reads_and_cannot_be_added_to()
    {
        using var api = new ApiFactory();
        var lakeside = await LakesideWith(api);
        await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await api.WrapUpAsync(lakeside.Id);

        var album = await lakeside.Host.AlbumAsync(lakeside.Id);

        Assert.Single(album.PhotoIds());
        Assert.False(album.GetProperty("canAdd").GetBoolean());
    }

    // Given a signed-in person who is not a member, or no session,
    // when they read an album, or that of a Popkin that does not exist,
    // then 404 popkin_not_found, or 401; a member who left reads it no more (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_reads_the_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/photos")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/photos")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/photos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync($"/api/popkins/{lakeside.Id}/photos")).StatusCode);
        await api.LeaveAsync(lakeside.Id, "Joel Ferreira");
        await (await joel.GetAsync($"/api/popkins/{lakeside.Id}/photos")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
