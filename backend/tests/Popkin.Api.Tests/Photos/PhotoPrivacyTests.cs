using System.Net;
using System.Text;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Photos;

/// <summary>What is kept of an added photo, and what is not (L2-031 AC6, L2-051 AC2, L2-054).</summary>
public sealed class PhotoPrivacyTests
{
    // Given a photo that carries a GPS position, the camera's make and model and an XMP packet,
    // when a member adds it,
    // then neither stored file carries any of it: the bytes read back have no EXIF, XMP or IPTC.
    [Fact]
    public async Task Stored_files_carry_no_location_or_device_data()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var upload = TestPhotos.FromAPhone(takenAt: "2026:11:07 07:02:00", offset: "-08:00");
        using (var sent = new MagickImage(upload))
        {
            // The upload does carry them, so their absence below is the server's doing.
            Assert.NotNull(sent.GetExifProfile()?.GetValue(ExifTag.GPSLatitude));
            Assert.NotNull(sent.GetXmpProfile());
        }

        await lakeside.Host.AddedPhotoAsync(lakeside.Id, upload);

        Assert.Equal(2, api.Photos.Files.Count);
        Assert.All(api.Photos.Files.Values, file =>
        {
            using var stored = new MagickImage(file.Content);
            Assert.Null(stored.GetExifProfile());
            Assert.Null(stored.GetXmpProfile());
            Assert.Null(stored.GetIptcProfile());
            Assert.Empty(stored.ProfileNames);
            var text = Encoding.Latin1.GetString(file.Content);
            Assert.DoesNotContain("Popkin Test Phone", text);
            Assert.DoesNotContain("Exif", text);
            Assert.DoesNotContain("xmpmeta", text);
        });
    }

    // Given a photo whose pixels lie on their side, with EXIF saying how to turn them,
    // when a member adds it,
    // then both stored files are upright, since the instruction is removed with the rest.
    [Fact]
    public async Task A_photo_is_turned_upright_before_its_data_is_removed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var photo = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(orientation: 6, width: 800, height: 600));

        Assert.Equal((600, 800), (photo.GetProperty("width").GetInt32(), photo.GetProperty("height").GetInt32()));
        Assert.All(api.Photos.Files.Values, file =>
        {
            using var stored = new MagickImage(file.Content);
            Assert.True(stored.Height > stored.Width);
        });
    }

    // Given a photo that says when it was taken,
    // when a member adds it, then that time is its `takenAt`, read before the data is removed:
    // at the offset the file gives, or as UTC when it gives none.
    [Theory]
    [InlineData("-08:00")]
    [InlineData("+05:30")]
    [InlineData(null)]
    public async Task A_photo_keeps_the_time_it_was_taken(string? offset)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var taken = api.Clock.GetUtcNow().AddDays(-6);
        var zone = offset is null ? TimeSpan.Zero : TimeSpan.Parse(offset.TrimStart('+'));

        var photo = await lakeside.Host.AddedPhotoAsync(
            lakeside.Id, TestPhotos.FromAPhone(taken.ToOffset(zone).ToString("yyyy:MM:dd HH:mm:ss"), offset));

        Assert.Equal(taken, photo.GetProperty("takenAt").GetDateTimeOffset());
        Assert.Equal(api.Clock.GetUtcNow(), photo.GetProperty("addedAt").GetDateTimeOffset());
    }

    // Given a photo that does not say when it was taken, or says a time still to come,
    // when a member adds it, then it counts as taken when it was added: a camera's wrong clock
    // never puts a photo in the future.
    [Theory]
    [InlineData(null)]
    [InlineData(1)]
    public async Task A_photo_without_a_usable_time_counts_as_taken_when_it_was_added(int? daysAhead)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var now = api.Clock.GetUtcNow();
        var takenAt = daysAhead is { } days ? now.AddDays(days).ToString("yyyy:MM:dd HH:mm:ss") : null;

        var photo = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(takenAt));

        Assert.Equal(now, photo.GetProperty("takenAt").GetDateTimeOffset());
        Assert.Equal(now, photo.GetProperty("addedAt").GetDateTimeOffset());
    }

    // Given two photos added by one member,
    // when their files are stored,
    // then each is under a key of its own that says nothing of the photo, and a key alone reads nothing.
    [Fact]
    public async Task Files_are_stored_under_keys_that_cannot_be_guessed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var first = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(), "Dock");
        var second = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone(), "Dock");

        var keys = api.Photos.Files.Keys.ToList();
        Assert.Equal(4, keys.Count);
        foreach (var photo in new[] { first, second })
        {
            // The id travels in addresses and events; the key must not follow from it.
            var id = photo.GetProperty("id").GetGuid();
            Assert.DoesNotContain(keys, key => key.Contains(id.ToString("N")) || key.Contains(id.ToString()));
        }

        Assert.DoesNotContain(keys, key => key.Contains("photo.jpg") || key.Contains("Dock"));
        // 122 random bits in each name: the two photos share no name.
        Assert.Equal(2, keys.Select(key => key.Split('/')[^1][..32]).Distinct().Count());
        foreach (var key in keys)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await lakeside.Host.GetAsync($"/api/files/{key}")).StatusCode);
        }
    }

    // Given the database fails as the photo is saved,
    // when a member adds a photo,
    // then the answer is a server error and the files written for it are deleted.
    [Fact]
    public async Task When_the_save_fails_the_stored_files_are_deleted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Faults.FailSaves = true;

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, TestPhotos.FromAPhone());

        await response.AssertProblem(HttpStatusCode.InternalServerError, "server_error");
        Assert.Empty(api.Photos.Files);
        using var scope = api.Services.CreateScope();
        Assert.Equal(0, scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Count());
    }
}
