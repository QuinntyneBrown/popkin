using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// The Schedules switch, `Features:Schedules` (ADR 0023): the header tells the app whether the
/// Schedule tab shows, and while it is off every Schedules request is refused with 404
/// `feature_off` (L2-072 AC1, L2-077 AC1, AC3).
/// </summary>
public sealed class SchedulesSwitchTests
{
    // Given Schedules is on, when a member reads the Popkin's header, then it says so, so the
    // Schedule tab shows (L2-072 AC1).
    [Fact]
    public async Task The_header_says_Schedules_is_on()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");

        Assert.True(header.GetProperty("schedules").GetBoolean());
    }

    // Given Schedules is off, when a member reads the header, then it says so, so there is no
    // Schedule tab; and any request for time off is refused with 404 `feature_off` and nothing of
    // the feature (L2-077 AC1, AC3).
    [Fact]
    public async Task While_Schedules_is_off_the_header_says_so_and_time_off_is_refused()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Schedules"] = "false";
        var lakeside = await api.StartLakesideAsync();

        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        var timeOff = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");

        Assert.False(header.GetProperty("schedules").GetBoolean());
        var problem = await timeOff.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.False(problem.TryGetProperty("members", out _));
    }

    // Given Schedules is off, when a person who is not a member asks for a Popkin's time off,
    // then the answer is the same 404 `feature_off`, which says nothing of the Popkin (L2-077 AC3,
    // L2-051).
    [Fact]
    public async Task While_Schedules_is_off_a_stranger_learns_only_that_it_is_off()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Schedules"] = "false";
        var lakeside = await api.StartLakesideAsync();
        var stranger = api.CreateBrowserClient();
        await stranger.SignUpAsync(api, "Joel Ferreira", "(415) 555-0123");

        var timeOff = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");

        await timeOff.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }
}
