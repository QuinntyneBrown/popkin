using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// GET /api/popkins/{popkinId}/plan/summary: the home's Plan section, the points left, how far
/// behind or ahead, and the three biggest open stories (L2-075 AC1, AC3).
/// </summary>
public sealed class PlanSummaryTests
{
    private static readonly DateTimeOffset FirstMorning = new(2027, 8, 30, 9, 0, 0, TimeSpan.Zero);

    // Given 27 points in To do and Doing on the first day and 8 of them done on the seventh, when a
    // member reads the summary, then 19 are left, 2 ahead, and the biggest open are the 8, the 5
    // and the first-added 3, never a story in Backlog or Done (L2-075 AC1).
    [Fact]
    public async Task Says_the_points_left_how_far_behind_and_the_biggest_open()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(FirstMorning);
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        await AddAsync(host, lakeside.Id, "Book the cabin at Pine Hollow", 8);
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", 5);
        await AddAsync(host, lakeside.Id, "Grocery list for three dinners", 3);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await AddAsync(host, lakeside.Id, "Everyone confirms the week off", 3);
        var deposits = await AddAsync(host, lakeside.Id, "Collect $150 deposits", 8);
        await AddAsync(host, lakeside.Id, "Kayak rental for two days", 8, "Backlog");
        await host.MoveStoryAsync(lakeside.Id, van, "Doing");
        api.Clock.Advance(TimeSpan.FromDays(6));
        await host.MoveStoryAsync(lakeside.Id, deposits, "Done");

        var response = await host.PlanSummaryAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(19, summary.GetProperty("pointsLeft").GetInt32());
        Assert.Equal(-2, summary.GetProperty("behind").GetInt32());
        Assert.Equal(
            ["Book the cabin at Pine Hollow", "Rent a 7-seat van", "Grocery list for three dinners"],
            summary.GetProperty("biggest").EnumerateArray().Select(s => s.GetProperty("title").GetString()));
    }

    // Given a Popkin with no story, then 204: the home shows no Plan section (L2-075 AC3).
    [Fact]
    public async Task Answers_nothing_before_the_first_story()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PlanSummaryAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // Given someone who is not a member, then 404 popkin_not_found; with Plan off, 404
    // feature_off, so the home shows no Plan section (L2-051 AC1, L2-075 AC3, L2-077 AC3).
    [Fact]
    public async Task Only_a_member_reads_it_and_only_while_Plan_is_on()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        await (await stranger.PlanSummaryAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");

        using var off = new ApiFactory();
        await off.SwitchFeatureAsync(Feature.Plan, FeatureMode.Off);
        var other = await off.StartLakesideAsync();
        await (await other.Host.PlanSummaryAsync(other.Id)).AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    private static async Task<Guid> AddAsync(HttpClient member, Guid popkinId, string title, int points, string column = "ToDo")
    {
        var response = await member.AddStoryAsync(popkinId, title, column, points);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
