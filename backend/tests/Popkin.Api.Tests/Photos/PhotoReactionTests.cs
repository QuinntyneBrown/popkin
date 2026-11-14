using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// PUT and DELETE /api/popkins/{popkinId}/photos/{photoId}/reactions/{emoji}: a member reacts to
/// a photo with emoji and takes a reaction away again (L2-034, L2-045 AC2, L2-051, L2-052 AC1).
/// </summary>
public sealed class PhotoReactionTests
{
    private static async Task<Guid> AlbumPhotoAsync(StartedPopkin lakeside) =>
        (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();

    // Given a photo of Mara's in the album, and Joel a member,
    // when Joel reacts with a heart, twice, and Mara with a heart and then with fire,
    // then 200 each time with the photo's reactions, in order of first given, each with its
    // count and whether the one asking gave it; a repeat changes nothing;
    // and the photo read carries the same reactions, "mine" for its reader.
    [Fact]
    public async Task Members_react_with_several_emoji_and_the_read_counts_them()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = await AlbumPhotoAsync(lakeside);

        var first = await joel.ReactToPhotoAsync(lakeside.Id, photoId, "❤️");
        var again = await joel.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var maras = await lakeside.Host.ReactedToPhotoAsync(lakeside.Id, photoId, "🔥");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["count", "emoji", "mine"], firstBody[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["❤️ 1 mine"], firstBody.Chips());
        Assert.Equal(["❤️ 1 mine"], again.Chips());
        Assert.Equal(["❤️ 2 mine", "🔥 1 mine"], maras.Chips());
        Assert.Equal(["❤️ 2 mine", "🔥 1"], (await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").Chips());
        Assert.Equal(["❤️ 2 mine", "🔥 1 mine"], (await lakeside.Host.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").Chips());
    }

    // Given a heart from Joel and from Mara on a photo,
    // when Joel takes his away, twice, then 200 both times with the heart at one, not his;
    // and when Mara takes hers away, then the heart is gone from the answer and from the read.
    [Fact]
    public async Task A_member_takes_their_reaction_away()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = await AlbumPhotoAsync(lakeside);
        await joel.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");
        await lakeside.Host.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");

        var taken = await joel.UnreactToPhotoAsync(lakeside.Id, photoId, "❤️");
        var again = await joel.UnreactToPhotoAsync(lakeside.Id, photoId, "❤️");
        var last = await lakeside.Host.UnreactToPhotoAsync(lakeside.Id, photoId, "❤️");

        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
        Assert.Equal(["❤️ 1"], (await taken.Content.ReadFromJsonAsync<JsonElement>()).Chips());
        Assert.Equal(["❤️ 1"], (await again.Content.ReadFromJsonAsync<JsonElement>()).Chips());
        Assert.Empty((await last.Content.ReadFromJsonAsync<JsonElement>()).Chips());
        Assert.Equal(0, (await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").GetArrayLength());
    }

    // Given a photo, when a member reacts with words, two emoji or nothing at all,
    // then 400 emoji_not_allowed and nothing is stored.
    [Theory]
    [InlineData("love")]
    [InlineData("❤️🔥")]
    [InlineData(" ")]
    public async Task Anything_but_one_emoji_is_refused(string emoji)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);

        var response = await lakeside.Host.ReactToPhotoAsync(lakeside.Id, photoId, emoji);

        await response.AssertProblem(HttpStatusCode.BadRequest, "emoji_not_allowed");
        Assert.Equal(0, (await lakeside.Host.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").GetArrayLength());
    }

    // Given a photo with Mara's heart, and Lakeside wrapped up keeping its album,
    // when Mara reacts or takes her heart away, then 409 popkin_wrapped_up, and the heart stays.
    [Fact]
    public async Task Nothing_changes_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);
        await lakeside.Host.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        var react = await lakeside.Host.ReactToPhotoAsync(lakeside.Id, photoId, "🔥");
        var unreact = await lakeside.Host.UnreactToPhotoAsync(lakeside.Id, photoId, "❤️");

        await react.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await unreact.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(["❤️ 1 mine"], (await lakeside.Host.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").Chips());
    }

    // Given a photo of Lakeside, when someone who is not a member reacts or takes a reaction
    // away, then 404 popkin_not_found; and a photo id of no photo is 404 photo_not_found.
    [Fact]
    public async Task A_non_member_and_a_missing_photo_are_not_found()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam", "(415) 555-0177");
        var photoId = await AlbumPhotoAsync(lakeside);

        await (await stranger.ReactToPhotoAsync(lakeside.Id, photoId, "❤️")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.UnreactToPhotoAsync(lakeside.Id, photoId, "❤️")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.ReactToPhotoAsync(lakeside.Id, Guid.NewGuid(), "❤️")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
    }

    // Given a photo Mara sent Walt in their direct message,
    // when Walt reacts, then 200, and Mara reads his reaction;
    // when Ruth, a third member, reacts or takes a reaction away, then 404 photo_not_found, as for no photo.
    [Fact]
    public async Task Only_the_two_members_react_to_a_direct_message_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var photoId = (await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId, "Just us")).PhotoIdOf();

        var walts = await walt.ReactedToPhotoAsync(lakeside.Id, photoId, "😍");
        var ruths = await ruth.ReactToPhotoAsync(lakeside.Id, photoId, "😍");
        var ruthsUndo = await ruth.UnreactToPhotoAsync(lakeside.Id, photoId, "😍");

        Assert.Equal(["😍 1 mine"], walts.Chips());
        Assert.Equal(["😍 1"], (await lakeside.Host.PhotoAsync(lakeside.Id, photoId)).GetProperty("reactions").Chips());
        await ruths.AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await ruthsUndo.AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
    }
}
