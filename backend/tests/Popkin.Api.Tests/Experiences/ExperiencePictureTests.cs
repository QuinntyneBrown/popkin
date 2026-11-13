using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// The picture of an experience (L2-040 AC1, AC3): it keeps the limits of L2-031 and goes
/// through the photo store and its processing, and it is not a photo of the album.
/// </summary>
public sealed class ExperiencePictureTests
{
    // Given a member and a picture from a phone, with its location and device data,
    // when they share an experience with it,
    // then the card gives the thumbnail at a signed address, a display image and a thumbnail are
    // stored without that data (L2-031 AC6), and the album has no photo more.
    [Fact]
    public async Task A_picture_is_stored_without_its_location_and_is_not_a_photo_of_the_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var card = await lakeside.Host.SharedExperienceAsync(
            lakeside.Id, "Sunrise canoe to Heron Point", picture: TestPhotos.FromAPhone(width: 3000, height: 2000));

        var thumbnail = await lakeside.Host.GetAsync(card.GetProperty("pictureUrl").GetString());
        Assert.Equal(HttpStatusCode.OK, thumbnail.StatusCode);
        Assert.Equal("image/jpeg", thumbnail.Content.Headers.ContentType?.MediaType);
        using var small = new MagickImage(await thumbnail.Content.ReadAsByteArrayAsync());
        Assert.Equal((480u, 320u), (small.Width, small.Height));
        Assert.Equal(2, api.Photos.Files.Count);
        Assert.All(api.Photos.Files.Values, file =>
        {
            using var stored = new MagickImage(file.Content);
            Assert.Null(stored.GetExifProfile());
            Assert.Null(stored.GetXmpProfile());
            Assert.Empty(stored.ProfileNames);
        });
        Assert.Equal([480u, 2048u], api.Photos.Files.Values.Select(f => new MagickImage(f.Content).Width).Order());
        var album = await lakeside.Host.AlbumAsync(lakeside.Id);
        Assert.Empty(album.PhotoIds());
        Assert.Equal(0, (await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/photos/summary")).GetProperty("count").GetInt32());
    }

    public static TheoryData<string, byte[]> AllowedPictures => new()
    {
        { "PNG", TestPhotos.WithLocation(MagickFormat.Png) },
        { "WebP", TestPhotos.WithLocation(MagickFormat.WebP) },
        { "HEIC", TestPhotos.Heic() },
    };

    // Given a PNG, a WebP or a HEIC picture, when a member shares an experience with it, then it is stored.
    [Theory]
    [MemberData(nameof(AllowedPictures))]
    public async Task A_PNG_WebP_or_HEIC_picture_is_kept(string type, byte[] picture)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire", picture: picture);

        Assert.True(response.StatusCode == HttpStatusCode.Created, $"{type}: {response.StatusCode}");
        Assert.Equal(2, api.Photos.Files.Count);
    }

    public static TheoryData<string, byte[]> RefusedFiles => new()
    {
        { "a text file named as a picture", "This is not a picture."u8.ToArray() },
        { "a GIF", TestPhotos.WithLocation(MagickFormat.Gif) },
        { "a file that starts like a JPEG and is not one", [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01] },
    };

    // Given a file that is not a JPEG, PNG, WebP or HEIC image, named and declared as a JPEG,
    // when a member shares an experience with it,
    // then 400 picture_type_not_allowed names the picture, and nothing is saved (L2-052 AC3).
    [Theory]
    [MemberData(nameof(RefusedFiles))]
    public async Task A_picture_that_is_not_an_allowed_image_is_refused_whatever_its_name_says(string what, byte[] file)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire", picture: file);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, what);
        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "picture_type_not_allowed");
        Assert.Equal("picture", body.GetProperty("field").GetString());
        AssertNothingSaved(api);
    }

    // Given a picture of 10 MB and one byte,
    // when a member shares an experience with it,
    // then 400 picture_too_large names the picture; one of exactly 10 MB is kept.
    [Fact]
    public async Task A_picture_is_at_most_10_MB()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var tooLarge = new byte[10 * 1024 * 1024 + 1];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(tooLarge, 0);

        var refused = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire", picture: tooLarge);

        var body = await refused.AssertProblem(HttpStatusCode.BadRequest, "picture_too_large");
        Assert.Equal("picture", body.GetProperty("field").GetString());
        AssertNothingSaved(api);
        var kept = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire", picture: tooLarge[..^1]);
        Assert.Equal(HttpStatusCode.Created, kept.StatusCode);
    }

    // Given a title that breaks its rule and a good picture,
    // when a member shares the experience, then the title is refused and no file is stored.
    [Fact]
    public async Task No_file_is_stored_for_an_experience_that_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "   ", picture: TestPhotos.WithLocation(MagickFormat.Jpeg));

        await response.AssertProblem(HttpStatusCode.BadRequest, "title_required");
        AssertNothingSaved(api);
    }

    // Given the database fails as the experience is saved,
    // when a member shares an experience with a picture,
    // then the answer is an error and the files written for it are deleted.
    [Fact]
    public async Task The_files_of_an_experience_that_was_not_saved_are_deleted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Faults.FailSaves = true;

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire", picture: TestPhotos.WithLocation(MagickFormat.Jpeg));

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        AssertNothingSaved(api);
    }

    private static void AssertNothingSaved(ApiFactory api)
    {
        Assert.Empty(api.Photos.Files);
        Assert.Equal(0, ShareExperienceTests.ExperienceCount(api));
    }
}
