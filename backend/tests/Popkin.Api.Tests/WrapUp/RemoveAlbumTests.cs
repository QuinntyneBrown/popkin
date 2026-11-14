using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;
using Popkin.Application.WrapUp;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// `RemoveWrappedUpAlbumsCommand`, which the Worker sends every hour, reached here through
/// MediatR: the photos of a Popkin wrapped up without its album go after 30 days (L2-045 AC4).
/// </summary>
public sealed class RemoveAlbumTests
{
    private static int AlbumFiles(ApiFactory api) => api.Photos.Files.Count;

    // Given Lakeside with two photos, an experience with a picture and a prepared export, wrapped up without its album,
    // when the tick comes a minute short of 30 days, then nothing is removed;
    // when it comes at 30 days, then the photos, their files and the export's zip are gone, the
    // experience keeps its picture, the Popkin says when the photos were removed, the recap still
    // counts the two, and the album can no longer be saved.
    [Fact]
    public async Task The_photos_go_30_days_after_a_wrap_up_without_the_album()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 400, 300));
        await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 300, 400));
        var experience = await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Bonfire", picture: TestPhotos.WithLocation(MagickFormat.Jpeg, 200, 200));
        // Three files for each of the two photos.
        var filesBeforeTheAlbum = AlbumFiles(api) - 6;
        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: false);
        (await lakeside.Host.PostAsync($"/api/popkins/{lakeside.Id}/recap/album-exports", null)).EnsureSuccessStatusCode();
        await api.SendAsync(new PrepareAlbumExportsCommand());
        api.Clock.Advance(TimeSpan.FromDays(30) - TimeSpan.FromMinutes(1));

        var early = await api.SendAsync(new RemoveWrappedUpAlbumsCommand());
        var albumEarly = await lakeside.Host.AlbumAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var due = await api.SendAsync(new RemoveWrappedUpAlbumsCommand());
        var again = await api.SendAsync(new RemoveWrappedUpAlbumsCommand());
        await lakeside.Host.SignInAgainAsync(api, "(415) 555-0148");

        Assert.Equal(0, early);
        Assert.Equal(2, albumEarly.PhotoIds().Count);
        Assert.Equal(1, due);
        Assert.Equal(0, again);
        Assert.Empty((await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds());
        Assert.Equal(filesBeforeTheAlbum, AlbumFiles(api));
        Assert.DoesNotContain(api.Photos.Files.Keys, k => k.EndsWith(".zip", StringComparison.Ordinal));
        var card = await lakeside.Host.ExperienceAsync(lakeside.Id, experience.Id());
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync(card.GetProperty("pictureUrl").GetString())).StatusCode);

        var home = await lakeside.Host.HomeAsync(lakeside.Id);
        Assert.Equal(api.Clock.GetUtcNow(), home.GetProperty("photosRemovedAt").GetDateTimeOffset());
        var recap = await lakeside.Host.ReadRecapAsync(lakeside.Id);
        Assert.Equal(api.Clock.GetUtcNow(), recap.GetProperty("photosRemovedAt").GetDateTimeOffset());
        Assert.Equal(api.Clock.GetUtcNow(), recap.GetProperty("photosRemoveAt").GetDateTimeOffset());
        Assert.Equal(0, recap.GetProperty("photos").GetArrayLength());
        Assert.Equal(2, recap.GetProperty("photoCount").GetInt32());
        await (await lakeside.Host.PostAsync($"/api/popkins/{lakeside.Id}/recap/album-exports", null))
            .AssertProblem(HttpStatusCode.Conflict, "album_removed");
    }

    // Given a Popkin wrapped up with its album kept, and one that is still active,
    // when the tick comes 60 days later, then no photo of either is removed (L2-043 AC2).
    [Fact]
    public async Task A_kept_album_and_an_active_Popkin_keep_their_photos()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, TimeSpan.FromMinutes(1));
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await api.AddPhotosAsync(bookClubId, "Sam Ortega", 3, TimeSpan.FromMinutes(1));
        await sam.WrappedUpAsync(bookClubId, keepPhotos: true);
        api.Clock.Advance(TimeSpan.FromDays(60));

        var removed = await api.SendAsync(new RemoveWrappedUpAlbumsCommand());

        await lakeside.Host.SignInAgainAsync(api, "(415) 555-0148");
        await sam.SignInAgainAsync(api, "(415) 555-0177");
        Assert.Equal(0, removed);
        Assert.Equal(2, (await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds().Count);
        Assert.Equal(3, (await sam.AlbumAsync(bookClubId)).PhotoIds().Count);
        Assert.Equal(JsonValueKind.Null, (await sam.HomeAsync(bookClubId)).GetProperty("photosRemovedAt").ValueKind);
    }

    // Given Walt's photo with text in Everyone, his photo without text in his direct message with
    // Mara, and a reply quoting the second, in Lakeside wrapped up without its album,
    // when the photos are removed 30 days on, then each message carries no photo and reads
    // "photoRemoved", keeping its text; the reply's quote reads "Photo removed" for the one
    // without text; and a message that never had a photo is untouched (L2-036 AC3, L2-045 AC4).
    [Fact]
    public async Task The_messages_of_removed_photos_read_Photo_removed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var captioned = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId, "Dock was glass");
        var plain = await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "Coffee's on");
        var bare = await walt.SentPhotoMessageAsync(lakeside.Id, directId);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var reply = await (await lakeside.Host.PostAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/threads/{directId}/messages",
            new { clientMessageId = Guid.NewGuid(), text = "Lovely", replyToMessageId = bare.Id() })).Content.ReadFromJsonAsync<JsonElement>();
        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: false);
        api.Clock.Advance(TimeSpan.FromDays(30));

        Assert.Equal(1, await api.SendAsync(new RemoveWrappedUpAlbumsCommand()));

        await lakeside.Host.SignInAgainAsync(api, "(415) 555-0148");
        var captionedNow = await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, captioned.Id());
        var bareNow = await lakeside.Host.MessageAsync(lakeside.Id, directId, bare.Id());
        Assert.Equal(JsonValueKind.Null, captionedNow.GetProperty("photo").ValueKind);
        Assert.True(captionedNow.GetProperty("photoRemoved").GetBoolean());
        Assert.Equal("Dock was glass", captionedNow.GetProperty("text").GetString());
        Assert.Equal(JsonValueKind.Null, bareNow.GetProperty("photo").ValueKind);
        Assert.True(bareNow.GetProperty("photoRemoved").GetBoolean());
        Assert.False((await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, plain.Id())).GetProperty("photoRemoved").GetBoolean());
        Assert.Equal("Photo removed", (await lakeside.Host.MessageAsync(lakeside.Id, directId, reply.Id())).GetProperty("quote").GetProperty("snippet").GetString());
    }
}
