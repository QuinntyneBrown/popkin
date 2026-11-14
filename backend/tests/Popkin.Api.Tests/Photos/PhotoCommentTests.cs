using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Photos;

/// <summary>
/// GET and POST /api/popkins/{popkinId}/photos/{photoId}/comments and DELETE …/comments/{commentId}:
/// members talk about a photo under it (L2-035, L2-045 AC2, L2-051, L2-052, L2-053, L2-054 AC3).
/// </summary>
public sealed class PhotoCommentTests
{
    private static async Task<Guid> AlbumPhotoAsync(StartedPopkin lakeside) =>
        (await lakeside.Host.AddedPhotoAsync(lakeside.Id, TestPhotos.FromAPhone())).GetProperty("id").GetGuid();

    // Given a photo of Mara's with no comments,
    // when Joel reads its comments, then none; when Joel comments "  Up at 6 again tomorrow?  "
    // and a minute later Mara comments, then 201 with the comment, its text trimmed, its author
    // by first name and avatar, when it was added and that it is his;
    // and the comments read oldest first, each "mine" for its own author only, and the photo
    // read counts two.
    [Fact]
    public async Task Members_comment_and_read_the_comments_oldest_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var photoId = await AlbumPhotoAsync(lakeside);

        var none = await joel.ReadPhotoCommentsAsync(lakeside.Id, photoId);
        var posted = await joel.CommentOnPhotoAsync(lakeside.Id, photoId, "  Up at 6 again tomorrow?  ");
        var joelsAt = api.Clock.GetUtcNow();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "Only if there's coffee <b>first</b>");

        Assert.Equal(0, none.GetArrayLength());
        Assert.Equal(HttpStatusCode.Created, posted.StatusCode);
        var comment = await posted.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["addedAt", "author", "id", "mine", "text"], comment.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["avatar", "firstName", "membershipId"], comment.GetProperty("author").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Joel", comment.GetProperty("author").GetProperty("firstName").GetString());
        Assert.Equal(await joel.MembershipIdAsync(lakeside.Id), comment.GetProperty("author").GetProperty("membershipId").GetGuid());
        Assert.Equal("JF", comment.GetProperty("author").GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal("Up at 6 again tomorrow?", comment.GetProperty("text").GetString());
        Assert.Equal(joelsAt, comment.GetProperty("addedAt").GetDateTimeOffset());
        Assert.True(comment.GetProperty("mine").GetBoolean());

        var joels = await joel.ReadPhotoCommentsAsync(lakeside.Id, photoId);
        var maras = await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId);
        Assert.Equal(["Up at 6 again tomorrow?", "Only if there's coffee <b>first</b>"], joels.CommentTexts());
        Assert.Equal(comment.Id(), joels[0].Id());
        Assert.Equal([true, false], joels.EnumerateArray().Select(c => c.GetProperty("mine").GetBoolean()));
        Assert.Equal([false, true], maras.EnumerateArray().Select(c => c.GetProperty("mine").GetBoolean()));
        Assert.Equal(2, (await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("commentCount").GetInt32());
    }

    // Given a photo, when a member comments nothing, only white space, or 501 characters,
    // then 400 comment_empty, comment_empty and comment_too_long, and nothing is stored;
    // 500 characters, with white space around them, is kept.
    [Fact]
    public async Task A_comment_is_1_to_500_characters_after_trimming()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);

        await (await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, null)).AssertProblem(HttpStatusCode.BadRequest, "comment_empty");
        await (await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, " \n ")).AssertProblem(HttpStatusCode.BadRequest, "comment_empty");
        await (await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, new string('a', 501))).AssertProblem(HttpStatusCode.BadRequest, "comment_too_long");
        var longest = await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, $"  {new string('a', 500)}  ");

        Assert.Equal(HttpStatusCode.Created, longest.StatusCode);
        Assert.Equal([new string('a', 500)], (await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId)).CommentTexts());
    }

    // Given Joel's comment and Mara's on a photo, Mara the Host,
    // when Mara deletes Joel's comment, then 403 comment_not_yours and it stays;
    // when Joel deletes his, then 204, it is gone from the comments and the count;
    // when he deletes it again, or a comment of no one, then 404 comment_not_found.
    [Fact]
    public async Task Only_its_author_deletes_a_comment()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var photoId = await AlbumPhotoAsync(lakeside);
        var joels = (await joel.CommentedOnPhotoAsync(lakeside.Id, photoId, "Up at 6 again tomorrow?")).Id();
        await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "Only if there's coffee");

        var byTheHost = await lakeside.Host.DeletePhotoCommentAsync(lakeside.Id, photoId, joels);
        var stays = await joel.ReadPhotoCommentsAsync(lakeside.Id, photoId);
        var byJoel = await joel.DeletePhotoCommentAsync(lakeside.Id, photoId, joels);
        var again = await joel.DeletePhotoCommentAsync(lakeside.Id, photoId, joels);
        var noOne = await joel.DeletePhotoCommentAsync(lakeside.Id, photoId, Guid.NewGuid());

        await byTheHost.AssertProblem(HttpStatusCode.Forbidden, "comment_not_yours");
        Assert.Equal(2, stays.GetArrayLength());
        Assert.Equal(HttpStatusCode.NoContent, byJoel.StatusCode);
        Assert.Equal(["Only if there's coffee"], (await joel.ReadPhotoCommentsAsync(lakeside.Id, photoId)).CommentTexts());
        Assert.Equal(1, (await joel.PhotoAsync(lakeside.Id, photoId)).GetProperty("commentCount").GetInt32());
        await again.AssertProblem(HttpStatusCode.NotFound, "comment_not_found");
        await noOne.AssertProblem(HttpStatusCode.NotFound, "comment_not_found");
    }

    // Given a comment of Joel's on one photo, when he deletes it through another photo, then 404 comment_not_found.
    [Fact]
    public async Task A_comment_is_found_only_under_its_own_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);
        var otherId = await AlbumPhotoAsync(lakeside);
        var comment = (await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "First light")).Id();

        await (await lakeside.Host.DeletePhotoCommentAsync(lakeside.Id, otherId, comment)).AssertProblem(HttpStatusCode.NotFound, "comment_not_found");
        Assert.Equal(1, (await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId)).GetArrayLength());
    }

    // Given a comment of Mara's, and Lakeside wrapped up keeping its album,
    // when she comments or deletes hers, then 409 popkin_wrapped_up;
    // and the comments are still read.
    [Fact]
    public async Task Comments_are_read_but_not_changed_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);
        var comment = (await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "First light")).Id();
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        await (await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, "One more")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await lakeside.Host.DeletePhotoCommentAsync(lakeside.Id, photoId, comment)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(["First light"], (await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId)).CommentTexts());
    }

    // Given a photo of Lakeside, when someone who is not a member reads, posts or deletes a
    // comment, then 404 popkin_not_found; for a photo id of no photo, 404 photo_not_found.
    [Fact]
    public async Task A_non_member_and_a_missing_photo_are_not_found()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam", "(415) 555-0177");
        var photoId = await AlbumPhotoAsync(lakeside);
        var comment = (await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "First light")).Id();

        await (await stranger.PhotoCommentsAsync(lakeside.Id, photoId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.CommentOnPhotoAsync(lakeside.Id, photoId, "Hi")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.DeletePhotoCommentAsync(lakeside.Id, photoId, comment)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.PhotoCommentsAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, Guid.NewGuid(), "Hi")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
    }

    // Given a photo Mara sent Walt in their direct message, with a comment of Walt's,
    // when Mara reads and comments, then she reads Walt's and adds hers;
    // when Ruth, a third member, reads, posts or deletes Walt's comment, then 404 photo_not_found.
    [Fact]
    public async Task Only_the_two_members_comment_on_a_direct_message_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var photoId = (await lakeside.Host.SentPhotoMessageAsync(lakeside.Id, directId, "Just us")).PhotoIdOf();
        var walts = (await walt.CommentedOnPhotoAsync(lakeside.Id, photoId, "Love this one")).Id();
        api.Clock.Advance(TimeSpan.FromMinutes(1));

        await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "Me too");

        Assert.Equal(["Love this one", "Me too"], (await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId)).CommentTexts());
        await (await ruth.PhotoCommentsAsync(lakeside.Id, photoId)).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await ruth.CommentOnPhotoAsync(lakeside.Id, photoId, "Me three")).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
        await (await ruth.DeletePhotoCommentAsync(lakeside.Id, photoId, walts)).AssertProblem(HttpStatusCode.NotFound, "photo_not_found");
    }

    // Given a member who has sent 60 messages within a minute,
    // when they comment on a photo, then 429 rate_limited: comments count with messages (L2-053 AC2).
    [Fact]
    public async Task Comments_count_with_messages_against_the_limit()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var photoId = await AlbumPhotoAsync(lakeside);
        for (var number = 1; number <= 59; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, $"Message {number}")).StatusCode);
        }

        var sixtieth = await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, "Comment 60");
        var refused = await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, "Comment 61");

        Assert.Equal(HttpStatusCode.Created, sixtieth.StatusCode);
        await refused.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(1, (await lakeside.Host.ReadPhotoCommentsAsync(lakeside.Id, photoId)).GetArrayLength());
    }

    // Given a member who comments on a photo, when the API logs the request, then no line carries the comment's text (L2-054 AC3).
    [Fact]
    public async Task The_text_of_a_comment_is_never_logged()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var photoId = await AlbumPhotoAsync(lakeside);

        await lakeside.Host.CommentedOnPhotoAsync(lakeside.Id, photoId, "Secret sunrise spot");
        await lakeside.Host.CommentOnPhotoAsync(lakeside.Id, photoId, new string('z', 501));

        Assert.DoesNotContain(api.Logs.Lines, line => line.Contains("Secret sunrise spot", StringComparison.Ordinal) || line.Contains("zzzzzzzzzz", StringComparison.Ordinal));
    }
}
