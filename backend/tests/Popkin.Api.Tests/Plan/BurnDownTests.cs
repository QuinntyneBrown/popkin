using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// GET /api/popkins/{popkinId}/plan/burn-down: the points left, how far behind or ahead, the
/// forecast, the points left at the end of each day and the biggest open stories (L2-071).
/// </summary>
public sealed class BurnDownTests
{
    private static readonly DateTimeOffset FirstMorning = new(2027, 8, 30, 9, 0, 0, TimeSpan.Zero);

    // Given 27 points in To do on the first day and 8 of them done on the seventh, when a member
    // reads the burn-down, then 19 are left, 2 ahead of the ideal 21, finishing Sep 17 at 1.6 a
    // day, 9 days early; the days read 27 six times then 19; the biggest open are the 8 in To do,
    // the 5 in Doing and the first-added 3, never a story in Backlog or Done (L2-071 AC2 to AC6).
    [Fact]
    public async Task Says_how_far_behind_or_ahead_the_plan_is_and_when_it_will_finish()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        await AddAsync(host, lakeside.Id, "Book the cabin at Pine Hollow", 8);
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);
        await AddAsync(host, lakeside.Id, "Grocery list for three dinners", 3);
        await AddAsync(host, lakeside.Id, "Everyone confirms the week off", 3);
        var deposits = await AddAsync(host, lakeside.Id, "Collect $150 deposits", 8);
        await AddAsync(host, lakeside.Id, "Kayak rental for two days", 8, "Backlog");
        await host.MoveStoryAsync(lakeside.Id, van, "Doing");

        api.Clock.Advance(TimeSpan.FromDays(6));
        await host.MoveStoryAsync(lakeside.Id, deposits, "Done");
        var burnDown = await ReadAsync(host, lakeside.Id);

        Assert.Equal("2027-08-30", burnDown.GetProperty("sprint").GetProperty("firstDay").GetString());
        Assert.Equal("2027-09-26", burnDown.GetProperty("sprint").GetProperty("lastDay").GetString());
        Assert.Equal(27, burnDown.GetProperty("startPoints").GetInt32());
        Assert.Equal(19, burnDown.GetProperty("pointsLeft").GetInt32());
        Assert.Equal(-2, burnDown.GetProperty("behind").GetInt32());
        var forecast = burnDown.GetProperty("forecast");
        Assert.Equal("Early", forecast.GetProperty("kind").GetString());
        Assert.Equal("2027-09-17", forecast.GetProperty("date").GetString());
        Assert.Equal(9, forecast.GetProperty("days").GetInt32());
        Assert.Equal([27, 27, 27, 27, 27, 27, 19], burnDown.GetProperty("days").EnumerateArray().Select(d => d.GetProperty("pointsLeft").GetInt32()));
        Assert.Equal("2027-09-05", burnDown.GetProperty("days")[6].GetProperty("day").GetString());
        Assert.Equal(
            ["Book the cabin at Pine Hollow", "Rent a 7-seat van", "Grocery list for three dinners"],
            burnDown.GetProperty("biggest").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
    }

    // Given every story done on the third day, then the forecast is done on that day, 25 days
    // early, with nothing open (L2-071 AC3).
    [Fact]
    public async Task Says_when_the_plan_was_done()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);
        api.Clock.Advance(TimeSpan.FromDays(2));
        await host.MoveStoryAsync(lakeside.Id, van, "Done");
        api.Clock.Advance(TimeSpan.FromDays(1));

        var burnDown = await ReadAsync(host, lakeside.Id);

        Assert.Equal(0, burnDown.GetProperty("pointsLeft").GetInt32());
        Assert.Equal("Done", burnDown.GetProperty("forecast").GetProperty("kind").GetString());
        Assert.Equal("2027-09-01", burnDown.GetProperty("forecast").GetProperty("date").GetString());
        Assert.Equal(25, burnDown.GetProperty("forecast").GetProperty("days").GetInt32());
        Assert.Equal(0, burnDown.GetProperty("biggest").GetArrayLength());
    }

    // Given a Popkin with no stories, then there is no sprint, no day and no forecast (L2-071 AC8).
    [Fact]
    public async Task Has_nothing_to_burn_down_before_the_first_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var burnDown = await ReadAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(JsonValueKind.Null, burnDown.GetProperty("sprint").ValueKind);
        Assert.Equal(JsonValueKind.Null, burnDown.GetProperty("forecast").ValueKind);
        Assert.Equal(0, burnDown.GetProperty("days").GetArrayLength());
        Assert.Equal(0, burnDown.GetProperty("pointsLeft").GetInt32());
    }

    // Given someone who is not a member, then 404 popkin_not_found; with Plan off, 404
    // feature_off (L2-051 AC1, L2-077 AC3).
    [Fact]
    public async Task Only_a_member_reads_it_and_only_while_Plan_is_on()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        await (await stranger.BurnDownAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");

        using var off = new ApiFactory();
        off.Settings["Features:Plan"] = "false";
        var other = await off.StartLakesideAsync();
        await (await other.Host.BurnDownAsync(other.Id)).AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    private static async Task<JsonElement> ReadAsync(HttpClient member, Guid popkinId)
    {
        var response = await member.BurnDownAsync(popkinId);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static async Task<Guid> AddAsync(HttpClient member, Guid popkinId, string title, int points, string column = "ToDo")
    {
        var response = await member.AddStoryAsync(popkinId, title, column, points);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
