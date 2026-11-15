using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// POST /api/popkins/{popkinId}/plan/stories: any member adds a story to the plan board (L2-069,
/// L2-068 AC13, L2-052).
/// </summary>
public sealed class AddStoryTests
{
    // Given a Popkin with no stories, when a member adds "Book the cabin at Pine Hollow" to To do
    // with 8 points, themselves on it and the tag Stay,
    // then 201 answers the story, the board shows it in To do, and the first story starts the sprint,
    // "Planning sprint", today, ending 27 days later (L2-069 AC5, L2-068 AC13).
    [Fact]
    public async Task A_member_adds_a_story_and_the_first_one_starts_the_sprint()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var today = DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);

        var response = await lakeside.Host.AddStoryAsync(lakeside.Id, "  Book the cabin at Pine Hollow ", "ToDo", 8, "Stay", mara);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var story = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Book the cabin at Pine Hollow", story.GetProperty("title").GetString());
        Assert.Equal("ToDo", story.GetProperty("column").GetString());
        Assert.Equal(8, story.GetProperty("points").GetInt32());
        Assert.Equal("Stay", story.GetProperty("tag").GetString());
        Assert.Equal(mara, story.GetProperty("owner").GetProperty("membershipId").GetGuid());
        Assert.Equal(mara, story.GetProperty("addedByMembershipId").GetGuid());
        Assert.True(story.GetProperty("canDelete").GetBoolean());
        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);
        Assert.Equal(["Book the cabin at Pine Hollow"], board.TitlesIn("ToDo"));
        var sprint = board.GetProperty("sprint");
        Assert.Equal("Planning sprint", sprint.GetProperty("name").GetString());
        Assert.Equal(today, DateOnly.Parse(sprint.GetProperty("firstDay").GetString()!));
        Assert.Equal(today.AddDays(27), DateOnly.Parse(sprint.GetProperty("lastDay").GetString()!));
    }

    // Given a board with a story in Backlog, when another member, not the Host, adds one to
    // Backlog with nobody on it, then it is last in Backlog, nobody owns it, and the board's
    // version moves on (L2-069 AC5, L2-068 AC12).
    [Fact]
    public async Task Any_member_adds_one_and_it_goes_last_in_its_column()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        await api.SeedStoryAsync(lakeside.Id, "Kayak rental for two days", StoryColumn.Backlog, 3, StoryTag.Fun);
        var before = (await joel.PlanBoardAsync(lakeside.Id)).GetProperty("version").GetInt64();
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        var response = await joel.AddStoryAsync(lakeside.Id, "Cabin playlist", "Backlog", 1, "Fun");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var story = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, story.GetProperty("owner").ValueKind);
        var board = await joel.PlanBoardAsync(lakeside.Id);
        Assert.Equal(["Kayak rental for two days", "Cabin playlist"], board.TitlesIn("Backlog"));
        Assert.True(board.GetProperty("version").GetInt64() > before);
    }

    // Given a title that is empty or only spaces, when a member adds it, then 400 title_required
    // names the title; one longer than 80 characters, 400 title_too_long; nothing is saved
    // (L2-069 AC4, L2-052 AC1).
    [Theory]
    [InlineData(null, "title_required")]
    [InlineData("   ", "title_required")]
    [InlineData("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "title_too_long")]
    public async Task A_title_is_1_to_80_characters(string? title, string code)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        await Refused(await lakeside.Host.AddStoryAsync(lakeside.Id, title), code, "title");

        Assert.Equal(0, (await lakeside.Host.PlanBoardAsync(lakeside.Id)).GetProperty("stories").GetArrayLength());
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.AddStoryAsync(lakeside.Id, new string('x', 80))).StatusCode);
    }

    // Given a request with points outside 1, 2, 3, 5 and 8, a tag outside the five, a column other
    // than Backlog or To do, or an owner who is not a member of the Popkin,
    // when a member adds it, then 400 names the field and nothing is saved (L2-069 AC8).
    [Fact]
    public async Task Points_tags_columns_and_owners_outside_the_rules_are_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var other = await api.StartLakesideAsync();
        var outsider = await other.Host.MembershipIdAsync(other.Id);

        await Refused(await lakeside.Host.AddStoryAsync(lakeside.Id, "Van", points: 4), "invalid_points", "points");
        await Refused(await lakeside.Host.AddStoryAsync(lakeside.Id, "Van", tag: "Weather"), "invalid_tag", "tag");
        await Refused(await lakeside.Host.AddStoryAsync(lakeside.Id, "Van", column: "Doing"), "invalid_column", "column");
        await Refused(await lakeside.Host.AddStoryAsync(lakeside.Id, "Van", ownerMembershipId: outsider), "invalid_owner", "ownerMembershipId");
        Assert.Equal(0, (await lakeside.Host.PlanBoardAsync(lakeside.Id)).GetProperty("stories").GetArrayLength());
    }

    // Given a signed-in person who is not a member, or no session, when they add a story,
    // then 404 popkin_not_found, or 401 (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_adds_a_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.AddStoryAsync(lakeside.Id, "Van")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().AddStoryAsync(lakeside.Id, "Van")).StatusCode);
    }

    private static async Task Refused(HttpResponseMessage response, string code, string field)
    {
        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, problem.GetProperty("field").GetString());
    }
}
