using System.Net;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// DELETE /api/popkins/{popkinId}/plan/stories/{storyId}: the person who added a story, its owner
/// or the Host deletes it; anyone else is refused (L2-070 AC4).
/// </summary>
public sealed class DeleteStoryTests
{
    // Given three stories, one added by Joel, one Joel owns and one neither, when Joel deletes the
    // first two and the Host the third, then each answers 204, the board no longer shows them and
    // its version moves on each time (L2-070 AC4).
    [Fact]
    public async Task The_person_who_added_it_its_owner_or_the_Host_deletes_a_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        var added = await api.SeedStoryAsync(lakeside.Id, "Kayak rental", StoryColumn.Backlog, 3, addedByMembershipId: joelId);
        var owned = await api.SeedStoryAsync(lakeside.Id, "Grocery list", StoryColumn.ToDo, 3, ownerMembershipId: joelId);
        var other = await api.SeedStoryAsync(lakeside.Id, "Cabin playlist", StoryColumn.Backlog, 1);
        var before = (await joel.PlanBoardAsync(lakeside.Id)).GetProperty("version").GetInt64();

        Assert.Equal(HttpStatusCode.NoContent, (await joel.DeleteStoryAsync(lakeside.Id, added)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await joel.DeleteStoryAsync(lakeside.Id, owned)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.DeleteStoryAsync(lakeside.Id, other)).StatusCode);

        var board = await joel.PlanBoardAsync(lakeside.Id);
        Assert.Equal(0, board.GetProperty("stories").GetArrayLength());
        Assert.Equal(before + 3, board.GetProperty("version").GetInt64());
    }

    // Given a story Joel did not add and does not own, when Joel deletes it, then 403
    // not_your_story and it stays; the board tells him he may not (canDelete false) (L2-070 AC4).
    [Fact]
    public async Task Anyone_else_is_refused_and_told_so_by_the_board()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);

        Assert.False((await joel.PlanBoardAsync(lakeside.Id)).StoryTitled("Rent a 7-seat van").GetProperty("canDelete").GetBoolean());
        await (await joel.DeleteStoryAsync(lakeside.Id, van)).AssertProblem(HttpStatusCode.Forbidden, "not_your_story");

        Assert.Equal(["Rent a 7-seat van"], (await joel.PlanBoardAsync(lakeside.Id)).TitlesIn("ToDo"));
    }

    // Given a story that is not on this board, then 404 story_not_found; given someone who is
    // not a member, then 404 popkin_not_found (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_deletes_a_story_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await lakeside.Host.DeleteStoryAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "story_not_found");
        await (await stranger.DeleteStoryAsync(lakeside.Id, van)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
