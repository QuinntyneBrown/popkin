using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// PUT /api/popkins/{popkinId}/plan/stories/{storyId}/column: any member moves a story on, or
/// marks it done (L2-070 AC1, AC2, L2-051).
/// </summary>
public sealed class MoveStoryTests
{
    // Given a story in To do and one in Doing, when a member who is not the Host moves the first
    // to Doing and marks the second done, then each answers the story in its new column, last in
    // it, and the board's version moves on (L2-070 AC2).
    [Fact]
    public async Task Any_member_moves_a_story_on_and_marks_one_done()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        await api.SeedStoryAsync(lakeside.Id, "Book the cabin", StoryColumn.Doing, 8);
        var dinner = await api.SeedStoryAsync(lakeside.Id, "Pick a place for Friday dinner", StoryColumn.Doing, 2);
        var before = (await joel.PlanBoardAsync(lakeside.Id)).GetProperty("version").GetInt64();
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        var moved = await joel.MoveStoryAsync(lakeside.Id, van, "Doing");
        var done = await joel.MoveStoryAsync(lakeside.Id, dinner, "Done");

        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        Assert.Equal("Doing", (await moved.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("column").GetString());
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        var board = await joel.PlanBoardAsync(lakeside.Id);
        Assert.Equal(["Book the cabin", "Rent a 7-seat van"], board.TitlesIn("Doing"));
        Assert.Equal(["Pick a place for Friday dinner"], board.TitlesIn("Done"));
        Assert.Equal(before + 2, board.GetProperty("version").GetInt64());
    }

    // Given a column that is not one of the four, then 400 invalid_column names it; given a story
    // of another Popkin or none, then 404 story_not_found; given someone who is not a member,
    // then 404 popkin_not_found (L2-052 AC1, L2-051 AC1).
    [Fact]
    public async Task Only_a_member_moves_a_story_of_their_Popkin_to_one_of_the_four_columns()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var other = await api.StartLakesideAsync();
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        var elsewhere = await api.SeedStoryAsync(other.Id, "Elsewhere", StoryColumn.ToDo, 2);
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        var problem = await (await lakeside.Host.MoveStoryAsync(lakeside.Id, van, "Later")).AssertProblem(HttpStatusCode.BadRequest, "invalid_column");
        Assert.Equal("column", problem.GetProperty("field").GetString());
        await (await lakeside.Host.MoveStoryAsync(lakeside.Id, elsewhere, "Done")).AssertProblem(HttpStatusCode.NotFound, "story_not_found");
        await (await lakeside.Host.MoveStoryAsync(lakeside.Id, Guid.NewGuid(), "Done")).AssertProblem(HttpStatusCode.NotFound, "story_not_found");
        await (await stranger.MoveStoryAsync(lakeside.Id, van, "Done")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(["Rent a 7-seat van"], (await lakeside.Host.PlanBoardAsync(lakeside.Id)).TitlesIn("ToDo"));
    }
}
