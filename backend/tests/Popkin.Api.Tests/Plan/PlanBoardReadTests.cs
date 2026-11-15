using System.Net;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// The plan board (L2-068): the sprint with its name, dates and days left, and every story with
/// its column, title, tag, points, owner and due date, in the order each column shows them.
/// </summary>
public sealed class PlanBoardReadTests
{
    // Given a Popkin with stories in each column, when a member opens the board, then it answers
    // the sprint, "Planning sprint", from the day of the first story to 27 days later with the
    // days left, and each story in its column in the order it was placed (L2-068 AC2 to AC4, AC13).
    [Fact]
    public async Task A_member_reads_the_sprint_and_every_story_by_column()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var today = DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);
        await api.SeedStoryAsync(lakeside.Id, "Kayak rental for two days", StoryColumn.Backlog, 3, StoryTag.Fun);
        await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5, StoryTag.Travel, dueDate: today.AddDays(9));
        await api.SeedStoryAsync(lakeside.Id, "Grocery list for three dinners", StoryColumn.ToDo, 3, StoryTag.Food);
        await api.SeedStoryAsync(lakeside.Id, "Book the cabin at Pine Hollow", StoryColumn.Doing, 8, StoryTag.Stay);
        await api.SeedStoryAsync(lakeside.Id, "Start the Popkin", StoryColumn.Done, 1, StoryTag.Fun);
        api.Clock.Advance(TimeSpan.FromDays(13));

        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);

        var sprint = board.GetProperty("sprint");
        Assert.Equal("Planning sprint", sprint.GetProperty("name").GetString());
        Assert.Equal(today, DateOnly.Parse(sprint.GetProperty("firstDay").GetString()!));
        Assert.Equal(today.AddDays(27), DateOnly.Parse(sprint.GetProperty("lastDay").GetString()!));
        Assert.Equal(14, sprint.GetProperty("daysLeft").GetInt32());
        Assert.Equal(["Kayak rental for two days"], board.TitlesIn("Backlog"));
        Assert.Equal(["Rent a 7-seat van", "Grocery list for three dinners"], board.TitlesIn("ToDo"));
        Assert.Equal(["Book the cabin at Pine Hollow"], board.TitlesIn("Doing"));
        Assert.Equal(["Start the Popkin"], board.TitlesIn("Done"));
        var van = board.StoryTitled("Rent a 7-seat van");
        Assert.Equal(5, van.GetProperty("points").GetInt32());
        Assert.Equal("Travel", van.GetProperty("tag").GetString());
        Assert.Equal(today.AddDays(9), DateOnly.Parse(van.GetProperty("dueDate").GetString()!));
        Assert.Equal(0, van.GetProperty("commentCount").GetInt32());
    }

    // Given a story with an owner, when the board shows it, then it names the owner with their
    // first name and avatar; a story nobody owns has no owner (L2-068 AC4).
    [Fact]
    public async Task A_story_names_its_owner_or_no_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        await api.SeedStoryAsync(lakeside.Id, "Book the cabin", StoryColumn.Doing, 8, StoryTag.Stay, ownerMembershipId: mara);
        await api.SeedStoryAsync(lakeside.Id, "Cabin playlist", StoryColumn.Backlog, 1, StoryTag.Fun);

        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);

        var owner = board.StoryTitled("Book the cabin").GetProperty("owner");
        Assert.Equal(mara, owner.GetProperty("membershipId").GetGuid());
        Assert.Equal("Mara", owner.GetProperty("firstName").GetString());
        Assert.Equal("MO", owner.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, board.StoryTitled("Cabin playlist").GetProperty("owner").ValueKind);
    }

    // Given a story, when a member reads the board, then it says whether they may delete it:
    // the person who added it, its owner or the Host may, anyone else may not (L2-070 AC4).
    [Fact]
    public async Task The_board_says_who_may_delete_each_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var priya = await api.SignedUpAsync("Priya Shah", "(415) 555-0177");
        (await priya.JoinAsync(lakeside.Code, "Priya Shah")).EnsureSuccessStatusCode();
        var priyaId = await priya.MembershipIdAsync(lakeside.Id);
        await api.SeedStoryAsync(lakeside.Id, "Hers", StoryColumn.ToDo, 2, addedByMembershipId: priyaId);
        await api.SeedStoryAsync(lakeside.Id, "Owned", StoryColumn.ToDo, 2, ownerMembershipId: priyaId);
        await api.SeedStoryAsync(lakeside.Id, "The Host's", StoryColumn.ToDo, 2);

        var asPriya = await priya.PlanBoardAsync(lakeside.Id);
        var asHost = await lakeside.Host.PlanBoardAsync(lakeside.Id);

        Assert.True(asPriya.StoryTitled("Hers").GetProperty("canDelete").GetBoolean());
        Assert.True(asPriya.StoryTitled("Owned").GetProperty("canDelete").GetBoolean());
        Assert.False(asPriya.StoryTitled("The Host's").GetProperty("canDelete").GetBoolean());
        Assert.All(asHost.GetProperty("stories").EnumerateArray(), s => Assert.True(s.GetProperty("canDelete").GetBoolean()));
    }

    // Given a Popkin with no stories, when the board opens, then there is no sprint and no story
    // (L2-068 AC9).
    [Fact]
    public async Task A_Popkin_with_no_stories_has_no_sprint_yet()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);

        Assert.Equal(System.Text.Json.JsonValueKind.Null, board.GetProperty("sprint").ValueKind);
        Assert.Empty(board.GetProperty("stories").EnumerateArray());
    }

    // Given the sprint's last day has passed, when the board opens, then the days left are 0,
    // never fewer (L2-068 AC13).
    [Fact]
    public async Task The_days_left_never_go_below_zero()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.SeedStoryAsync(lakeside.Id, "Pick the dates", StoryColumn.ToDo, 2);
        api.Clock.Advance(TimeSpan.FromDays(29));

        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);

        Assert.Equal(0, board.GetProperty("sprint").GetProperty("daysLeft").GetInt32());
    }

    // Given a person who is not a member, when they ask for a Popkin's board, then it is 404
    // `popkin_not_found`, which says nothing of the Popkin (L2-051).
    [Fact]
    public async Task A_stranger_cannot_read_the_board()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");

        var board = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/plan");

        await board.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
