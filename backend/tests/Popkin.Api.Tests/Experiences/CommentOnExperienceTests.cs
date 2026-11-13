using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// PUT /api/popkins/{popkinId}/experiences/{experienceId}/my-rating/comment: a member adds a few
/// words to their rating, or replaces them (L2-041, L2-038 AC4, L2-045 AC2, L2-052).
/// </summary>
public sealed class CommentOnExperienceTests
{
    // Given a member who gave an experience five stars,
    // when they post a comment,
    // then 200 answers it with their first name, avatar and stars and when it was written,
    // and the experience lists it under what people said and as the member's own (L2-041 AC3).
    [Fact]
    public async Task A_member_who_has_rated_adds_a_comment()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Sunrise canoe to Heron Point")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        api.Clock.Advance(TimeSpan.FromMinutes(2));
        var now = api.Clock.GetUtcNow();

        var response = await lakeside.Host.CommentAsync(lakeside.Id, id, "  Worth the 6 am alarm.  ");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var comment = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Worth the 6 am alarm.", comment.GetProperty("text").GetString());
        Assert.Equal("Mara", comment.GetProperty("firstName").GetString());
        Assert.Equal("MO", comment.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(5, comment.GetProperty("stars").GetInt32());
        Assert.Equal(now, comment.GetProperty("commentedAt").GetDateTimeOffset());
        Assert.NotEqual(Guid.Empty, comment.GetProperty("membershipId").GetGuid());
        Assert.Equal(["avatar", "commentedAt", "firstName", "membershipId", "stars", "text"], comment.EnumerateObject().Select(p => p.Name).Order());
        var detail = await lakeside.Host.ExperienceAsync(lakeside.Id, id);
        var listed = Assert.Single(detail.GetProperty("comments").EnumerateArray());
        Assert.Equal(comment.ToString(), listed.ToString());
        Assert.Equal("Worth the 6 am alarm.", detail.GetProperty("myRating").GetProperty("comment").GetString());
    }

    // Given Mara commented, then Joel, and Dev rated without a comment,
    // when Mara edits her comment and then changes her stars,
    // then what people said is the newest first: Mara's new words, with her new stars, then Joel's;
    // Dev's rating without words is not listed (L2-038 AC4, L2-041 AC4).
    [Fact]
    public async Task What_people_said_is_newest_first_and_an_edit_replaces_the_comment()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Sunrise canoe to Heron Point")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        await joel.RatedAsync(lakeside.Id, id, 4);
        await dev.RatedAsync(lakeside.Id, id, 3);
        await lakeside.Host.CommentedAsync(lakeside.Id, id, "Worth the 6 am alarm.");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await joel.CommentedAsync(lakeside.Id, id, "My arms disagree.");
        Assert.Equal(["Joel", "Mara"], Said(await dev.ExperienceAsync(lakeside.Id, id)).Select(c => c.FirstName));

        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var edited = await lakeside.Host.CommentedAsync(lakeside.Id, id, "Still worth it.");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await joel.RatedAsync(lakeside.Id, id, 2);
        await lakeside.Host.RatedAsync(lakeside.Id, id, 4);

        Assert.Equal("Still worth it.", edited.GetProperty("text").GetString());
        var detail = await dev.ExperienceAsync(lakeside.Id, id);
        Assert.Equal([("Mara", 4, "Still worth it."), ("Joel", 2, "My arms disagree.")], Said(detail));
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("myRating").GetProperty("comment").ValueKind);
        Assert.Equal("Still worth it.", (await lakeside.Host.ExperienceAsync(lakeside.Id, id)).GetProperty("myRating").GetProperty("comment").GetString());
    }

    public static TheoryData<string?, string> RefusedComments => new()
    {
        { null, "comment_required" },
        { "", "comment_required" },
        { "   \n ", "comment_required" },
        { new string('a', 501), "comment_too_long" },
    };

    // Given a comment that is empty or longer than 500 characters,
    // when a member posts it, then 400 with its code names the text, and the comment they had stays (L2-041 AC2).
    [Theory]
    [MemberData(nameof(RefusedComments))]
    public async Task A_comment_is_1_to_500_characters(string? text, string code)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        await lakeside.Host.CommentedAsync(lakeside.Id, id, "Steep, and worth it.");

        var response = await lakeside.Host.CommentAsync(lakeside.Id, id, text);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal("text", body.GetProperty("field").GetString());
        Assert.Equal([("Mara", 5, "Steep, and worth it.")], Said(await lakeside.Host.ExperienceAsync(lakeside.Id, id)));
    }

    // Given a comment of exactly 500 characters with white space around it, and one that is markup,
    // when a member posts each, then it is kept, and answered as the text it is (L2-052 AC2).
    [Fact]
    public async Task A_comment_of_500_characters_is_kept_and_markup_is_text()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);

        var longest = await lakeside.Host.CommentedAsync(lakeside.Id, id, $"  {new string('a', 500)}  ");
        var markup = await lakeside.Host.CommentedAsync(lakeside.Id, id, "<img src=x onerror=alert(1)>");

        Assert.Equal(500, longest.GetProperty("text").GetString()!.Length);
        Assert.Equal("<img src=x onerror=alert(1)>", markup.GetProperty("text").GetString());
    }

    // Given a member who has not rated the experience,
    // when they post a comment, then 409 rating_required;
    // given a wrapped-up Popkin, when a member who rated posts one, then 409 popkin_wrapped_up (L2-045 AC2).
    [Fact]
    public async Task A_comment_needs_a_rating_and_an_active_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);

        await (await joel.CommentAsync(lakeside.Id, id, "Lovely.")).AssertProblem(HttpStatusCode.Conflict, "rating_required");
        await api.WrapUpAsync(lakeside.Id);
        await (await lakeside.Host.CommentAsync(lakeside.Id, id, "Lovely.")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Empty(Said(await lakeside.Host.ExperienceAsync(lakeside.Id, id)));
    }

    // Given a signed-in person who is not a member, or no session,
    // when they comment, then 404 popkin_not_found, or 401;
    // given a member, when they comment on an experience that is not in the Popkin, then 404 experience_not_found.
    [Fact]
    public async Task Only_a_member_comments_on_an_experience_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.CommentAsync(lakeside.Id, id, "Lovely.")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.CommentAsync(lakeside.Id, Guid.NewGuid(), "Lovely.")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().CommentAsync(lakeside.Id, id, "Lovely.")).StatusCode);
    }

    private static List<(string? FirstName, int Stars, string? Text)> Said(JsonElement detail) =>
        detail.GetProperty("comments").EnumerateArray()
            .Select(c => (c.GetProperty("firstName").GetString(), c.GetProperty("stars").GetInt32(), c.GetProperty("text").GetString()))
            .ToList();
}
