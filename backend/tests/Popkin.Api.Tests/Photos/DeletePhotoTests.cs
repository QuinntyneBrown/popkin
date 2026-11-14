using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// DELETE /api/popkins/{popkinId}/photos/{photoId}: the member who added a photo, or the Host,
/// deletes it after confirming (L2-036 AC2); it leaves the album, its reactions and comments go
/// with it, and every chat message that carried it reads "Photo removed" (AC3).
/// </summary>
public sealed class DeletePhotoTests
{
    // Given a photo Joel added to the album, with a reaction and a comment, and Mara with Lakeside open,
    // when Joel deletes it, then 204; it is gone from the album and the photo view (404
    // photo_not_found); its reactions, its comments and its three files are gone, and its
    // addresses no longer answer; and Mara is told PhotoDeleted with the Popkin and the photo.
    [Fact]
    public async Task The_uploader_deletes_their_photo_and_nothing_of_it_is_left()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = (await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        await lakeside.Host.ReactedToPhotoAsync(lakeside.Id, photoId, "❤️");
        await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "First light");
        var view = await lakeside.Host.PhotoAsync(lakeside.Id, photoId);
        var keys = api.FileKeysOf(photoId);
        await using var marasHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var response = await joel.DeletePhotoAsync(lakeside.Id, photoId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.DoesNotContain(photoId, (await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds());
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos/{photoId}")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        Assert.Equal((0, 0), api.EngagementOf(photoId));
        Assert.False(api.Photos.Files.ContainsKey(keys.Display));
        Assert.False(api.Photos.Files.ContainsKey(keys.Thumbnail));
        Assert.NotNull(keys.Original);
        Assert.False(api.Photos.Files.ContainsKey(keys.Original));
        Assert.Equal(HttpStatusCode.NotFound, (await lakeside.Host.GetAsync(view.GetProperty("imageUrl").GetString())).StatusCode);
        var told = await marasHub.WaitForAsync("PhotoDeleted");
        Assert.Equal([lakeside.Id, photoId], told.Arguments.Select(a => a.GetGuid()));
    }

    // Given a photo Joel added, and Ruth a member,
    // when Ruth deletes it, then 403 photo_not_yours and it stays;
    // when Mara, the Host, deletes it, then 204.
    [Fact]
    public async Task The_Host_deletes_any_album_photo_and_another_member_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var photoId = (await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();

        var ruths = await ruth.DeletePhotoAsync(lakeside.Id, photoId);
        var stays = (await ruth.AlbumAsync(lakeside.Id)).PhotoIds();
        var maras = await lakeside.Host.DeletePhotoAsync(lakeside.Id, photoId);

        await ruths.AssertProblem(HttpStatusCode.Forbidden, "photo_not_yours");
        Assert.Contains(photoId, stays);
        Assert.Equal(HttpStatusCode.NoContent, maras.StatusCode);
        Assert.Empty((await ruth.AlbumAsync(lakeside.Id)).PhotoIds());
    }

    // Given Walt's photo without text in Everyone, a reply of Mara's quoting it, and his photo
    // with text "Dock was glass",
    // when the Host deletes the first and Walt the second, then each message stays with its text,
    // no photo, and "photoRemoved" true; a message that never had a photo says false;
    // the quote of the reply reads "Photo removed"; and the Chat tab, the home's Chat card and
    // My Popkins read "Photo removed" for a latest message with no text.
    [Fact]
    public async Task Every_message_that_carried_it_reads_Photo_removed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var everyoneId = await walt.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var captioned = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId, "Dock was glass");
        var plain = await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "Coffee's on");
        var reply = await (await lakeside.Host.PostAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/threads/{everyoneId}/messages",
            new { clientMessageId = Guid.NewGuid(), text = "Lovely", replyToMessageId = captioned.Id() })).Content.ReadFromJsonAsync<JsonElement>();
        var bare = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId);
        var replyToBare = await (await lakeside.Host.PostAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/threads/{everyoneId}/messages",
            new { clientMessageId = Guid.NewGuid(), text = "Wow", replyToMessageId = bare.Id() })).Content.ReadFromJsonAsync<JsonElement>();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var latestBare = await walt.SentPhotoMessageAsync(lakeside.Id, everyoneId);

        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.DeletePhotoAsync(lakeside.Id, bare.PhotoIdOf())).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await walt.DeletePhotoAsync(lakeside.Id, captioned.PhotoIdOf())).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await walt.DeletePhotoAsync(lakeside.Id, latestBare.PhotoIdOf())).StatusCode);

        var bareNow = await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, bare.Id());
        var captionedNow = await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, captioned.Id());
        Assert.Equal(JsonValueKind.Null, bareNow.GetProperty("photo").ValueKind);
        Assert.True(bareNow.GetProperty("photoRemoved").GetBoolean());
        Assert.Equal("", bareNow.GetProperty("text").GetString());
        Assert.Equal(JsonValueKind.Null, captionedNow.GetProperty("photo").ValueKind);
        Assert.True(captionedNow.GetProperty("photoRemoved").GetBoolean());
        Assert.Equal("Dock was glass", captionedNow.GetProperty("text").GetString());
        Assert.False((await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, plain.Id())).GetProperty("photoRemoved").GetBoolean());
        Assert.Equal("Dock was glass", (await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, reply.Id())).GetProperty("quote").GetProperty("snippet").GetString());
        Assert.Equal("Photo removed", (await lakeside.Host.MessageAsync(lakeside.Id, everyoneId, replyToBare.Id())).GetProperty("quote").GetProperty("snippet").GetString());

        var threads = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads");
        var card = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads/everyone/preview");
        var mine = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/popkins");
        Assert.Equal("Photo removed", threads.GetProperty("everyone").GetProperty("latest").GetProperty("text").GetString());
        Assert.Equal("Photo removed", card.GetProperty("messages").EnumerateArray().Last().GetProperty("text").GetString());
        Assert.Equal("Photo removed", mine.GetProperty("active")[0].GetProperty("latestMessage").GetProperty("text").GetString());
    }

    // Given a photo Mara sent Walt in their direct message, Ruth a third member, and all three with Lakeside open,
    // when Walt deletes it, then 403 photo_not_yours; when Ruth does, then 404 photo_not_found;
    // when Mara deletes it, then 204; the message reads "Photo removed" in the Chat tab of both;
    // Walt is told PhotoDeleted, and Ruth is not, though she hears what follows in Everyone.
    [Fact]
    public async Task Only_its_sharer_deletes_a_direct_message_photo_and_only_the_two_are_told()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var sent = await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId);
        var photoId = sent.PhotoIdOf();
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        await using var ruthHub = await api.CreateHubConnectionAsync(ruth);

        var walts = await walt.DeletePhotoAsync(lakeside.Id, photoId);
        var ruths = await ruth.DeletePhotoAsync(lakeside.Id, photoId);
        var maras = await lakeside.Host.DeletePhotoAsync(lakeside.Id, photoId);
        var after = await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "After");

        await walts.AssertProblem(HttpStatusCode.Forbidden, "photo_not_yours");
        await ruths.AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        Assert.Equal(HttpStatusCode.NoContent, maras.StatusCode);
        var message = await walt.MessageAsync(lakeside.Id, directId, sent.Id());
        Assert.True(message.GetProperty("photoRemoved").GetBoolean());
        foreach (var member in new[] { lakeside.Host, walt })
        {
            var threads = await member.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads");
            Assert.Equal("Photo removed", threads.GetProperty("direct")[0].GetProperty("latest").GetProperty("text").GetString());
        }

        var told = await waltHub.WaitForAsync("PhotoDeleted");
        Assert.Equal([lakeside.Id, photoId], told.Arguments.Select(a => a.GetGuid()));
        await ruthHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == after.Id());
        Assert.Empty(ruthHub.ReceivedNamed("PhotoDeleted"));
    }

    // Given a photo of Mara's and Lakeside wrapped up keeping its album,
    // when Mara deletes it, then 409 popkin_wrapped_up and it stays;
    // and someone who is not a member is 404 popkin_not_found.
    [Fact]
    public async Task Nothing_is_deleted_from_a_wrapped_up_Popkin_or_by_a_non_member()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam", "(415) 555-0177");
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();

        await (await stranger.DeletePhotoAsync(lakeside.Id, photoId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        await (await lakeside.Host.DeletePhotoAsync(lakeside.Id, photoId)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal([photoId], (await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds());
    }

    // Given a photo, and a photo store that cannot delete files just now,
    // when its uploader deletes it, then 204 and the photo is gone; the failure is logged with
    // the photo's id, and no line names a file of it.
    [Fact]
    public async Task A_file_left_behind_is_logged_and_does_not_fail_the_deletion()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();
        var keys = api.FileKeysOf(photoId);
        api.Photos.FailDeletes = true;

        var response = await lakeside.Host.DeletePhotoAsync(lakeside.Id, photoId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty((await lakeside.Host.AlbumAsync(lakeside.Id)).PhotoIds());
        Assert.Contains(api.Logs.Lines, line => line.Contains(photoId.ToString(), StringComparison.Ordinal));
        Assert.DoesNotContain(api.Logs.Lines, line => line.Contains(keys.Display, StringComparison.Ordinal));
    }
}
