using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>The `PhotosAdded` event of `PopkinHub` (L2-031 AC7, L2-051).</summary>
public sealed class LivePhotosTests
{
    // Given two members with Popkin open,
    // when one adds a photo,
    // then the other's connection receives PhotosAdded with the Popkin and the photo's id,
    // and so does the uploader's own.
    [Fact]
    public async Task A_new_photo_is_announced_to_the_members_with_Popkin_open()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var added = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg), "Canoe race");

        var received = await joelHub.WaitForAsync("PhotosAdded", timeout: TimeSpan.FromSeconds(1));
        Assert.Equal(lakeside.Id, received.Arguments[0].GetGuid());
        Assert.Equal([added.GetProperty("id").GetGuid()], received.Arguments[1].EnumerateArray().Select(id => id.GetGuid()));
        await maraHub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == added.GetProperty("id").GetGuid());
        // The event is a hint: the read it points at gives the photo.
        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync($"/api/popkins/{lakeside.Id}/photos/{received.Arguments[1][0].GetGuid()}")).StatusCode);
    }

    // Given a file that is refused,
    // when a member adds it and then a photo that is stored,
    // then the only PhotosAdded the others receive is that of the stored photo.
    [Fact]
    public async Task A_refused_photo_is_announced_to_nobody()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await using var hub = await api.CreateHubConnectionAsync(lakeside.Host);

        await lakeside.Host.AddPhotoAsync(lakeside.Id, "This is not a photo."u8.ToArray());
        var stored = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));

        await hub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == stored.GetProperty("id").GetGuid());
        Assert.Single(hub.ReceivedNamed("PhotosAdded"));
    }

    // Given a signed-in person with Popkin open who is not a member of Lakeside,
    // when a photo is added in Lakeside and then one in their own Popkin,
    // then they receive their own Popkin's photo and nothing of Lakeside's (L2-051).
    [Fact]
    public async Task A_person_who_is_not_a_member_hears_nothing_of_a_Popkins_photos()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await using var samHub = await api.CreateHubConnectionAsync(sam);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var lakesides = await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await maraHub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == lakesides.GetProperty("id").GetGuid());
        var bookClubs = await sam.AddedPhotoAsync(bookClubId, TestPhotos.WithLocation(MagickFormat.Jpeg));

        await samHub.WaitForAsync("PhotosAdded", e => e.Arguments[1][0].GetGuid() == bookClubs.GetProperty("id").GetGuid());
        Assert.Equal([bookClubId], samHub.ReceivedNamed("PhotosAdded").Select(e => e.Arguments[0].GetGuid()));
        Assert.Equal([lakeside.Id], maraHub.ReceivedNamed("PhotosAdded").Select(e => e.Arguments[0].GetGuid()));
    }
}
