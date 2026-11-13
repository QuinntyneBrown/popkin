using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Invites;

/// <summary>The optional photo of joining (L2-013 AC2, L2-051 AC2, L2-052 AC3, L2-054).</summary>
public sealed class ProfilePhotoTests
{
    private static async Task<(StartedPopkin Lakeside, HttpClient Joel)> Invited(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var joel = api.CreateBrowserClient();
        await joel.SignUpAsync(api, "Joel", "(415) 555-0123");
        return (lakeside, joel);
    }

    private static async Task<string> JoelsPhotoUrl(ApiFactory api, StartedPopkin lakeside)
    {
        var preview = await api.CreateBrowserClient().GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");
        return preview.GetProperty("avatars")[1].GetProperty("photoUrl").GetString()!;
    }

    [Fact]
    public async Task A_photo_becomes_the_members_avatar_without_its_location_or_device_data()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);

        var response = await joel.JoinAsync(lakeside.Code, "Joel", TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var file = await api.CreateBrowserClient().GetAsync(await JoelsPhotoUrl(api, lakeside));
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("image/jpeg", file.Content.Headers.ContentType?.MediaType);
        using var stored = new MagickImage(await file.Content.ReadAsByteArrayAsync());
        Assert.Null(stored.GetExifProfile());
        Assert.Null(stored.GetXmpProfile());
        Assert.Null(stored.GetIptcProfile());
        // An avatar is small: no side is longer than 512 px, and the shape is kept.
        Assert.Equal(512u, stored.Width);
        Assert.Equal(341u, stored.Height);
    }

    public static TheoryData<string, byte[]> AllowedPhotos => new()
    {
        { "PNG", TestPhotos.WithLocation(MagickFormat.Png) },
        { "WebP", TestPhotos.WithLocation(MagickFormat.WebP) },
        { "HEIC", TestPhotos.Heic() },
    };

    [Theory]
    [MemberData(nameof(AllowedPhotos))]
    public async Task A_PNG_WebP_or_HEIC_photo_is_accepted_whatever_the_file_is_called(string type, byte[] photo)
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);

        var response = await joel.JoinAsync(lakeside.Code, "Joel", photo, fileName: "photo.bin", contentType: "application/octet-stream");

        Assert.True(response.StatusCode == HttpStatusCode.Created, $"{type}: {response.StatusCode}");
        var file = await api.CreateBrowserClient().GetAsync(await JoelsPhotoUrl(api, lakeside));
        using var stored = new MagickImage(await file.Content.ReadAsByteArrayAsync());
        Assert.Equal(MagickFormat.Jpeg, stored.Format);
        Assert.Null(stored.GetExifProfile());
    }

    public static TheoryData<string, byte[]> RefusedFiles => new()
    {
        { "a text file named as a photo", "This is not a photo."u8.ToArray() },
        { "a GIF", TestPhotos.WithLocation(MagickFormat.Gif) },
        { "a file that starts like a JPEG and is not one", [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01] },
    };

    [Theory]
    [MemberData(nameof(RefusedFiles))]
    public async Task A_file_that_is_not_an_allowed_image_is_refused_whatever_its_name_says(string what, byte[] file)
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);

        var response = await joel.JoinAsync(lakeside.Code, "Joel", file, fileName: "me.jpg", contentType: "image/jpeg");

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, what);
        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_type_not_allowed");
        Assert.Equal("photo", body.GetProperty("field").GetString());
        Assert.Equal(1, api.MembershipCount());
        Assert.Empty(api.Photos.Files);
    }

    [Fact]
    public async Task A_photo_over_10_MB_is_refused()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);
        var tooLarge = new byte[10 * 1024 * 1024 + 1];
        TestPhotos.WithLocation(MagickFormat.Jpeg).CopyTo(tooLarge, 0);

        var response = await joel.JoinAsync(lakeside.Code, "Joel", tooLarge);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "photo_too_large");
        Assert.Equal("photo", body.GetProperty("field").GetString());
        Assert.Equal(1, api.MembershipCount());
    }

    [Fact]
    public async Task A_photos_address_expires_and_cannot_be_guessed()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);
        await joel.JoinAsync(lakeside.Code, "Joel", TestPhotos.WithLocation(MagickFormat.Jpeg));
        var url = await JoelsPhotoUrl(api, lakeside);
        var anyone = api.CreateBrowserClient();
        var key = api.Photos.Files.Keys.Single();

        Assert.Equal(HttpStatusCode.OK, (await anyone.GetAsync(url)).StatusCode);
        // The key alone, a changed signature and a later expiry on the same signature all fail.
        Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync($"/api/files/{key}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync(url[..^4] + "AAAA")).StatusCode);
        var expires = long.Parse(System.Web.HttpUtility.ParseQueryString(new Uri(new Uri("https://localhost"), url).Query)["expires"]!);
        Assert.Equal(HttpStatusCode.NotFound, (await anyone.GetAsync(url.Replace($"expires={expires}", $"expires={expires + 86_400}"))).StatusCode);

        api.Clock.Advance(TimeSpan.FromHours(2));

        await (await anyone.GetAsync(url)).AssertProblem(HttpStatusCode.NotFound, "file_not_found");
    }

    [Fact]
    public async Task Who_is_already_in_shows_a_members_photo()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);
        await joel.JoinAsync(lakeside.Code, "Joel", TestPhotos.WithLocation(MagickFormat.Jpeg));
        var walt = api.CreateBrowserClient();
        await walt.SignUpAsync(api, "Walt", "(415) 555-0177");

        var body = await walt.GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}/members");

        var joelsAvatar = body.GetProperty("members")[1].GetProperty("avatar");
        Assert.StartsWith("/api/files/", joelsAvatar.GetProperty("photoUrl").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("members")[0].GetProperty("avatar").GetProperty("photoUrl").ValueKind);
    }

    [Fact]
    public async Task When_joining_fails_the_photo_is_not_kept()
    {
        using var api = new ApiFactory();
        var (lakeside, joel) = await Invited(api);
        api.Faults.FailSaves = true;

        var response = await joel.JoinAsync(lakeside.Code, "Joel", TestPhotos.WithLocation(MagickFormat.Jpeg));

        await response.AssertProblem(HttpStatusCode.InternalServerError, "server_error");
        Assert.Empty(api.Photos.Files);
    }
}
