using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// PUT /api/popkins/{popkinId}/plan/stories/{storyId}: any member saves a change to a story's
/// title, column, points, owner, tag or due date, under the rules of adding one (L2-070 AC3, AC8).
/// </summary>
public sealed class SaveStoryTests
{
    // Given "Rent a 7-seat van" in To do, when a member saves it as "Rent a 9-seat van" in Doing,
    // with 8 points, Joel on it, the tag Money and a due date, then 200 answers it as saved and the
    // board shows it last in Doing (L2-070 AC3, AC8).
    [Fact]
    public async Task A_member_saves_every_field_of_a_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        await api.SeedStoryAsync(lakeside.Id, "Book the cabin", StoryColumn.Doing, 8);
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        var response = await joel.SaveStoryAsync(lakeside.Id, van, " Rent a 9-seat van ", "Doing", 8, "Money", joelId, "2027-02-20");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var story = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Rent a 9-seat van", story.GetProperty("title").GetString());
        Assert.Equal("Doing", story.GetProperty("column").GetString());
        Assert.Equal(8, story.GetProperty("points").GetInt32());
        Assert.Equal("Money", story.GetProperty("tag").GetString());
        Assert.Equal(joelId, story.GetProperty("owner").GetProperty("membershipId").GetGuid());
        Assert.Equal("2027-02-20", story.GetProperty("dueDate").GetString());
        Assert.Equal(["Book the cabin", "Rent a 9-seat van"], (await joel.PlanBoardAsync(lakeside.Id)).TitlesIn("Doing"));
    }

    // Given a story with an owner and a due date, when a member saves it with nobody on it and no
    // due date, then both are cleared, and it keeps its place in its column (L2-070 AC8).
    [Fact]
    public async Task Saving_clears_the_owner_and_the_due_date_and_keeps_the_place()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5, ownerMembershipId: mara, dueDate: new DateOnly(2026, 9, 21));
        await api.SeedStoryAsync(lakeside.Id, "Grocery list", StoryColumn.ToDo, 3);

        var response = await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Rent a 7-seat van", "ToDo", 5);

        var story = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, story.GetProperty("owner").ValueKind);
        Assert.Equal(JsonValueKind.Null, story.GetProperty("dueDate").ValueKind);
        Assert.Equal(["Rent a 7-seat van", "Grocery list"], (await lakeside.Host.PlanBoardAsync(lakeside.Id)).TitlesIn("ToDo"));
    }

    // Given a change that breaks the rules of a story, then 400 names the field and nothing is
    // saved; given a story that is not on this board, then 404 story_not_found (L2-070 AC3, L2-052).
    [Fact]
    public async Task A_change_keeps_the_rules_of_a_new_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);

        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "  "), "title_required", "title");
        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Van", points: 13), "invalid_points", "points");
        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Van", tag: "Weather"), "invalid_tag", "tag");
        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Van", column: "Later"), "invalid_column", "column");
        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Van", ownerMembershipId: Guid.NewGuid()), "invalid_owner", "ownerMembershipId");
        await Refused(await lakeside.Host.SaveStoryAsync(lakeside.Id, van, "Van", dueDate: "the 21st"), "invalid_due_date", "dueDate");
        await (await lakeside.Host.SaveStoryAsync(lakeside.Id, Guid.NewGuid(), "Van")).AssertProblem(HttpStatusCode.NotFound, "story_not_found");
        Assert.Equal(["Rent a 7-seat van"], (await lakeside.Host.PlanBoardAsync(lakeside.Id)).TitlesIn("ToDo"));
    }

    private static async Task Refused(HttpResponseMessage response, string code, string field)
    {
        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, problem.GetProperty("field").GetString());
    }
}
