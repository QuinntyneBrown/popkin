using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// POST /api/popkins/{popkinId}/threads/{threadId}/photos: the photo a message will carry, with
/// the limits of the album (L2-026 AC4, L2-031 AC2, AC6, L2-045 AC2, L2-051, L2-052 AC3).
/// </summary>
public sealed class UploadThreadPhotoTests
{
    // Given a member of Lakeside,
    // when they upload a phone's photo for Everyone,
    // then 201 answers its id, the expiring address of its display image and its size, and
    // neither stored file carries the photo's location or the phone's model (L2-031 AC6).
    [Fact]
    public async Task A_member_uploads_a_photo_for_a_message_of_Everyone()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, TestPhotos.FromAPhone(width: 800, height: 600));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var photo = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["id", "url", "width", "height"], photo.EnumerateObject().Select(p => p.Name));
        Assert.Equal((800, 600), (photo.GetProperty("width").GetInt32(), photo.GetProperty("height").GetInt32()));
        var url = photo.GetProperty("url").GetString()!;
        Assert.Contains("expires=", url);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync(url)).StatusCode);
        Assert.Equal(3, api.Photos.Files.Count);
        Assert.All(api.Photos.Files.Values, file =>
        {
            using var stored = new MagickImage(file.Content);
            Assert.Empty(stored.ProfileNames);
            Assert.DoesNotContain("Popkin Test Phone", Encoding.Latin1.GetString(file.Content));
        });
    }

    // Given the direct message between two members,
    // when one of them uploads a photo for it, then 201;
    // when a third member uploads one for it, then 404 thread_not_found, as for no thread (L2-023 AC2).
    [Fact]
    public async Task Only_the_two_members_of_a_direct_message_upload_for_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt Brennan");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var threadId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));

        var walts = await walt.UploadThreadPhotoAsync(lakeside.Id, threadId, TestPhotos.FromAPhone());
        var ruths = await ruth.UploadThreadPhotoAsync(lakeside.Id, threadId, TestPhotos.FromAPhone());
        var nowhere = await walt.UploadThreadPhotoAsync(lakeside.Id, Guid.NewGuid(), TestPhotos.FromAPhone());

        Assert.Equal(HttpStatusCode.Created, walts.StatusCode);
        await ruths.AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await nowhere.AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        Assert.Equal(1, api.PhotoCount());
    }

    // Given a person who is not a member of Lakeside,
    // when they upload a photo for its Everyone, then 404 popkin_not_found, and nothing is stored (L2-051 AC3).
    [Fact]
    public async Task A_person_who_is_not_a_member_uploads_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        var response = await sam.UploadThreadPhotoAsync(lakeside.Id, everyoneId, TestPhotos.FromAPhone());

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Empty(api.Photos.Files);
    }

    public static TheoryData<string, byte[]> RefusedFiles => new()
    {
        { "a text file named as a photo", "This is not a photo."u8.ToArray() },
        { "a GIF", TestPhotos.WithLocation(MagickFormat.Gif) },
        { "an empty file", [] },
    };

    // Given a file that is not a JPEG, PNG, WebP or HEIC image, named and declared as a JPEG,
    // when a member uploads it, then 400 photo_type_not_allowed names the file, and nothing is stored (L2-052 AC3).
    [Theory]
    [MemberData(nameof(RefusedFiles))]
    public async Task A_file_that_is_not_an_allowed_image_is_refused(string what, byte[] file)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, file);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, what);
        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
        Assert.Equal("file", body.GetProperty("field").GetString());
        Assert.Equal(0, api.PhotoCount());
    }

    // Given a photo of 10 MB and one byte, when a member uploads it, then 400 photo_too_large
    // names the file; a photo of exactly 10 MB is stored (L2-031 AC2).
    [Fact]
    public async Task A_photo_is_at_most_10_MB()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var tooLarge = new byte[Popkin.Domain.Photo.MaxFileBytes + 1];
        var largest = new byte[Popkin.Domain.Photo.MaxFileBytes];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(tooLarge, 0);
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(largest, 0);

        var refused = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, tooLarge);
        var stored = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, largest);

        var body = await refused.AssertProblem(HttpStatusCode.BadRequest, "photo_too_large");
        Assert.Equal("file", body.GetProperty("field").GetString());
        Assert.Equal(HttpStatusCode.Created, stored.StatusCode);
    }

    // Given a form with no file in it, when a member sends it, then 400 validation_failed names the file.
    [Fact]
    public async Task A_request_without_a_file_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, file: null);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
        Assert.Equal("file", body.GetProperty("field").GetString());
    }

    // Given a wrapped-up Popkin, when a member uploads a photo for a thread of it,
    // then 409 popkin_wrapped_up, and nothing is stored (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_uploaded_to_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, TestPhotos.FromAPhone());

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Empty(api.Photos.Files);
    }

    // Given a request body over 10 MB and 64 KB, when a member sends it, then 413 request_too_large, and nothing is stored.
    [Fact]
    public async Task A_body_over_the_request_limit_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var file = new byte[Popkin.Domain.Photo.MaxFileBytes + (64 * 1024) + 1];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(file, 0);

        var response = await lakeside.Host.UploadThreadPhotoAsync(lakeside.Id, everyoneId, file);

        await response.AssertProblem(HttpStatusCode.RequestEntityTooLarge, "request_too_large");
        Assert.Empty(api.Photos.Files);
    }
}
