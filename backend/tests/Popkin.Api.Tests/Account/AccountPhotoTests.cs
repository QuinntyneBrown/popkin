using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Account;

/// <summary>PUT /api/account/photo: a new photo shows wherever the person appears (L2-048 AC2, L2-052 AC3).</summary>
public sealed class AccountPhotoTests
{
    private static Task<HttpResponseMessage> ChangePhotoAsync(HttpClient client, byte[] photo, string fileName = "me.jpg")
    {
        var file = new ByteArrayContent(photo);
        file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        return client.PutAsync("/api/account/photo", new MultipartFormDataContent { { file, "photo", fileName } });
    }

    // Given Mara, who hosts Lakeside Weekend with no photo,
    // when she saves a photo with its location in it,
    // then her account, her session and Lakeside's members all show it, and the file has no
    // location or device data and no side longer than 512 px;
    // when she saves another, then the first file is gone.
    [Fact]
    public async Task A_new_photo_shows_wherever_the_person_appears()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await ChangePhotoAsync(lakeside.Host, TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var photoUrl = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("photoUrl").GetString()!;
        var file = await api.CreateBrowserClient().GetAsync(photoUrl);
        using (var stored = new MagickImage(await file.Content.ReadAsByteArrayAsync()))
        {
            Assert.Null(stored.GetExifProfile());
            Assert.Equal(512u, stored.Width);
        }

        Assert.Equal(JsonValueKind.String, (await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/auth/session")).GetProperty("photoUrl").ValueKind);
        Assert.Equal(JsonValueKind.String, (await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/account")).GetProperty("photoUrl").ValueKind);
        var members = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/members");
        Assert.Equal(JsonValueKind.String, members[0].GetProperty("avatar").GetProperty("photoUrl").ValueKind);
        var filesWithOne = api.Photos.Files.Count;

        (await ChangePhotoAsync(lakeside.Host, TestPhotos.WithLocation(MagickFormat.Png))).EnsureSuccessStatusCode();

        Assert.Equal(filesWithOne, api.Photos.Files.Count);
        Assert.Equal(HttpStatusCode.NotFound, (await api.CreateBrowserClient().GetAsync(photoUrl)).StatusCode);
    }

    // Given Mara, when she saves a file called me.jpg that is not an image, then it is refused
    // with 400 `photo_type_not_allowed`, and nothing is stored.
    [Fact]
    public async Task A_file_that_is_not_an_image_is_refused_whatever_it_is_called()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await ChangePhotoAsync(mara, "not a photo at all"u8.ToArray());

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
        Assert.Equal("photo", problem.GetProperty("field").GetString());
        Assert.Empty(api.Photos.Files);
    }

    // Given Mara, when she saves a photo over 10 MB, then it is refused with 400 `photo_too_large`.
    [Fact]
    public async Task A_photo_over_10_MB_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var photo = TestPhotos.WithLocation(MagickFormat.Jpeg);
        var large = photo.Concat(new byte[(10 * 1024 * 1024) + 1 - photo.Length]).ToArray();

        var response = await ChangePhotoAsync(mara, large);

        await response.AssertProblem(HttpStatusCode.BadRequest, "photo_too_large");
    }
}
