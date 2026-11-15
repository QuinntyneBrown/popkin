using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// The Plan switch, `Features:Plan` (ADR 0023): the header tells the app whether the Plan tab
/// shows, and while it is off every Plan request is refused with 404 `feature_off`
/// (L2-068 AC1, L2-077 AC1, AC3).
/// </summary>
public sealed class PlanSwitchTests
{
    // Given Plan is on, when a member reads the Popkin's header, then it says so, so the Plan tab
    // shows (L2-068 AC1).
    [Fact]
    public async Task The_header_says_Plan_is_on()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");

        Assert.True(header.GetProperty("plan").GetBoolean());
    }

    // Given Plan is off, when a member reads the header, then it says so, so there is no Plan
    // tab; and the plan board is refused with 404 `feature_off` and nothing of the feature
    // (L2-077 AC1, AC3).
    [Fact]
    public async Task While_Plan_is_off_the_header_says_so_and_the_board_is_refused()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Plan"] = "false";
        var lakeside = await api.StartLakesideAsync();

        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        var board = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/plan");

        Assert.False(header.GetProperty("plan").GetBoolean());
        var problem = await board.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.False(problem.TryGetProperty("stories", out _));
    }

    // Given Plan is off, when a person who is not a member asks for a Popkin's plan, then the
    // answer is the same 404 `feature_off`, which says nothing of the Popkin (L2-077 AC3, L2-051).
    [Fact]
    public async Task While_Plan_is_off_a_stranger_learns_only_that_it_is_off()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Plan"] = "false";
        var lakeside = await api.StartLakesideAsync();
        var stranger = api.CreateBrowserClient();
        await stranger.SignUpAsync(api, "Joel Ferreira", "(415) 555-0123");

        var board = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/plan");

        await board.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }
}
