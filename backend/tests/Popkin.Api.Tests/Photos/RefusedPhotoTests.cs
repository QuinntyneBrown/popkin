using System.Net;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Photos;

/// <summary>What POST /api/popkins/{popkinId}/photos refuses (L2-031 AC2, AC3, L2-045 AC2, L2-052 AC1, AC3).</summary>
public sealed class RefusedPhotoTests
{
    public static TheoryData<string, byte[]> RefusedFiles => new()
    {
        { "a text file named as a photo", "This is not a photo."u8.ToArray() },
        { "a GIF", TestPhotos.WithLocation(MagickFormat.Gif) },
        { "a file that starts like a JPEG and is not one", [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01] },
        { "an empty file", [] },
    };

    // Given a file that is not a JPEG, PNG, WebP or HEIC image, named and declared as a JPEG,
    // when a member adds it,
    // then 400 photo_type_not_allowed names the file, and nothing is stored (L2-052 AC3).
    [Theory]
    [MemberData(nameof(RefusedFiles))]
    public async Task A_file_that_is_not_an_allowed_image_is_refused_whatever_its_name_says(string what, byte[] file)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, file, fileName: "photo.jpg", contentType: "image/jpeg");

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, what);
        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
        Assert.Equal("file", body.GetProperty("field").GetString());
        AssertNothingStored(api);
    }

    // Given a photo of 10 MB and one byte,
    // when a member adds it,
    // then 400 photo_too_large names the file, and not a bare answer of the server's size limit.
    [Fact]
    public async Task A_photo_over_10_MB_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var tooLarge = new byte[10 * 1024 * 1024 + 1];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(tooLarge, 0);

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, tooLarge);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_too_large");
        Assert.Equal("file", body.GetProperty("field").GetString());
        AssertNothingStored(api);
    }

    // Given a photo of exactly 10 MB, when a member adds it, then it is stored.
    [Fact]
    public async Task A_photo_of_10_MB_is_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        // A JPEG ends at its end marker; a decoder reads no further, so the file is padded to size.
        var largest = new byte[10 * 1024 * 1024];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(largest, 0);

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, largest);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // Given a caption of 201 characters,
    // when a member adds a photo with it, then 400 caption_too_long names the caption;
    // a caption of 200 characters, with white space around it, is kept.
    [Fact]
    public async Task A_caption_is_at_most_200_characters()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var file = TestPhotos.WithLocation(MagickFormat.Jpeg);

        var refused = await lakeside.Host.AddPhotoAsync(lakeside.Id, file, new string('a', 201));

        var body = await refused.AssertProblem(HttpStatusCode.BadRequest, "caption_too_long");
        Assert.Equal("caption", body.GetProperty("field").GetString());
        AssertNothingStored(api);
        var kept = await lakeside.Host.AddedPhotoAsync(lakeside.Id, file, $"  {new string('a', 200)}  ");
        Assert.Equal(200, kept.GetProperty("caption").GetString()!.Length);
    }

    // Given a request with a caption and no file,
    // when a member sends it, then 400 validation_failed names the file.
    [Fact]
    public async Task A_request_without_a_file_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, file: null, caption: "No photo here");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
        Assert.Equal("file", body.GetProperty("field").GetString());
        AssertNothingStored(api);
    }

    // Given a wrapped-up Popkin,
    // when a member adds a photo, then 409 popkin_wrapped_up, and nothing is stored (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_added_to_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        AssertNothingStored(api);
    }

    private static void AssertNothingStored(ApiFactory api)
    {
        Assert.Empty(api.Photos.Files);
        using var scope = api.Services.CreateScope();
        Assert.Equal(0, scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Count());
    }
}
