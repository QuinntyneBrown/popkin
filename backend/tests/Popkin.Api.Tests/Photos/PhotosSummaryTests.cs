using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// GET /api/popkins/{popkinId}/photos/summary with photos in the album (L2-019 AC4). The empty
/// album and who may read are in `HomeSummariesTests`.
/// </summary>
public sealed class PhotosSummaryTests
{
    // Given an album of ten photos,
    // when a member reads the photos summary,
    // then it counts all ten and lists the latest eight in the album's order,
    // each with its thumbnail at an expiring address and its caption.
    [Fact]
    public async Task The_summary_counts_the_album_and_lists_its_latest_eight()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var all = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 10, TimeSpan.FromMinutes(1));

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/photos/summary");

        Assert.Equal(10, summary.GetProperty("count").GetInt32());
        var photos = summary.GetProperty("photos").EnumerateArray().ToList();
        Assert.Equal(all.AsEnumerable().Reverse().Take(8), photos.Select(p => p.GetProperty("id").GetGuid()));
        Assert.Equal((await lakeside.Host.AlbumAsync(lakeside.Id, "limit=8")).PhotoIds(), photos.Select(p => p.GetProperty("id").GetGuid()));
        Assert.Equal(["caption", "id", "thumbnailUrl"], photos[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Photo 10 by Mara Okafor", photos[0].GetProperty("caption").GetString());
        Assert.StartsWith("/api/files/", photos[0].GetProperty("thumbnailUrl").GetString());
        Assert.Contains("-thumbnail.jpg?expires=", photos[0].GetProperty("thumbnailUrl").GetString());
    }

    // Given a photo added without a caption,
    // when a member reads the summary, then its caption is null and its thumbnail can be read.
    [Fact]
    public async Task The_summary_shows_a_photo_as_it_was_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var added = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone());

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/photos/summary");

        Assert.Equal(1, summary.GetProperty("count").GetInt32());
        var photo = summary.GetProperty("photos")[0];
        Assert.Equal(added.GetProperty("id").GetGuid(), photo.GetProperty("id").GetGuid());
        Assert.Equal(JsonValueKind.Null, photo.GetProperty("caption").ValueKind);
        Assert.True((await lakeside.Host.GetAsync(photo.GetProperty("thumbnailUrl").GetString())).IsSuccessStatusCode);
    }
}
