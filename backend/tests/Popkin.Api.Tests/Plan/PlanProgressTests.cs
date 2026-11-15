using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// The points left at the end of each day of the sprint, as the board's progress answers them
/// (L2-068 AC7): a story into Done takes its points off that day, one out of Done adds them back
/// (L2-070 AC5), and a story added or its points changed counts on the day it happens, so the line
/// can rise (L2-070 AC6).
/// </summary>
public sealed class PlanProgressTests
{
    private static readonly DateTimeOffset FirstMorning = new(2027, 8, 30, 9, 0, 0, TimeSpan.Zero);

    // Given 5 and 3 points in To do on the first day, when the 5 is done on the second day and
    // moved back to Doing on the third, then the days read 8, 3, 8.
    [Fact]
    public async Task A_story_into_Done_takes_its_points_off_the_day_and_out_of_Done_adds_them_back()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);
        await AddAsync(host, lakeside.Id, "Grocery list", 3);

        api.Clock.Advance(TimeSpan.FromDays(1));
        await host.MoveStoryAsync(lakeside.Id, van, "Done");
        api.Clock.Advance(TimeSpan.FromDays(1));
        await host.MoveStoryAsync(lakeside.Id, van, "Doing");

        var progress = (await host.PlanBoardAsync(lakeside.Id)).GetProperty("progress");
        Assert.Equal([8, 3, 8], Sparkline(progress));
        Assert.Equal(8, progress.GetProperty("pointsLeft").GetInt32());
    }

    // Given 5 points in To do, when its points change to 8 the next day and an idea goes to
    // Backlog, then that day reads 8: the line rises, and Backlog is not in the sprint.
    [Fact]
    public async Task A_story_added_or_its_points_raised_counts_on_that_day()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);

        api.Clock.Advance(TimeSpan.FromDays(1));
        await host.SaveStoryAsync(lakeside.Id, van, "Rent a 9-seat van", points: 8);
        await AddAsync(host, lakeside.Id, "Kayak rental", 3, "Backlog");

        var progress = (await host.PlanBoardAsync(lakeside.Id)).GetProperty("progress");
        Assert.Equal([5, 8], Sparkline(progress));
    }

    // Given 5 points in To do, when the story is deleted the next day, then the first day still
    // counts it and the day of the delete does not.
    [Fact]
    public async Task A_deleted_story_still_counts_on_the_days_before()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);
        await AddAsync(host, lakeside.Id, "Cabin playlist", 1, "Backlog");

        api.Clock.Advance(TimeSpan.FromDays(1));
        await host.DeleteStoryAsync(lakeside.Id, van);

        var progress = (await host.PlanBoardAsync(lakeside.Id)).GetProperty("progress");
        Assert.Equal([5, 0], Sparkline(progress));
        Assert.Equal(0, progress.GetProperty("pointsLeft").GetInt32());
    }

    // Given 32 points on the first day and 24 left on the fourteenth, then the board is 7 behind
    // the ideal of 17 (the mocks' sprint); with no stories, it has no progress.
    [Fact]
    public async Task The_board_says_how_far_behind_the_ideal_line_the_plan_is()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        Assert.Equal(JsonValueKind.Null, (await host.PlanBoardAsync(lakeside.Id)).GetProperty("progress").ValueKind);
        var cabin = await AddAsync(host, lakeside.Id, "Book the cabin at Pine Hollow", 8);
        await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 8);
        await AddAsync(host, lakeside.Id, "Grocery list", 8);
        await AddAsync(host, lakeside.Id, "Shared sheet to split costs", 8);

        api.Clock.Advance(TimeSpan.FromDays(13));
        await host.MoveStoryAsync(lakeside.Id, cabin, "Done");

        var progress = (await host.PlanBoardAsync(lakeside.Id)).GetProperty("progress");
        Assert.Equal(24, progress.GetProperty("pointsLeft").GetInt32());
        Assert.Equal(7, progress.GetProperty("behind").GetInt32());
        Assert.Equal(14, Sparkline(progress).Length);
    }

    private static async Task<Guid> AddAsync(HttpClient member, Guid popkinId, string title, int points, string column = "ToDo")
    {
        var response = await member.AddStoryAsync(popkinId, title, column, points);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static int[] Sparkline(JsonElement progress) =>
        progress.GetProperty("sparkline").EnumerateArray().Select(p => p.GetInt32()).ToArray();
}
