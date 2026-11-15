using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// The home's Schedule section (L2-075 AC2, AC3): whether anyone has entered hours in the seven
/// days from the viewer's today, and the first evening everyone is free, with its time.
/// </summary>
public sealed class ScheduleSummaryTests
{
    private static readonly DateOnly Saturday = new(2026, 9, 12);
    private static readonly DateOnly Wednesday = new(2026, 9, 16);

    // Given Jun works every evening from Saturday to Tuesday and Priya till 7:30 pm on Wednesday,
    // when Mara's home reads the summary from Saturday, then everyone is first free on Wednesday,
    // from 19:30 (L2-075 AC2).
    [Fact]
    public async Task The_summary_names_the_first_evening_everyone_is_free()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");
        for (var i = 0; i < 4; i++)
        {
            await api.SetHoursAsync(lakeside.Id, "Jun Park", Saturday.AddDays(i), ("14:00", "22:00"));
        }

        await api.SetHoursAsync(lakeside.Id, "Priya Shah", Wednesday, ("09:00", "19:30"));

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/summary?from=2026-09-12");

        Assert.True(summary.GetProperty("hasHours").GetBoolean());
        Assert.Equal("2026-09-16", summary.GetProperty("day").GetString());
        Assert.Equal("19:30", summary.GetProperty("everyoneFreeFrom").GetString());
    }

    // Given Jun works every evening of the seven days, when the summary is read, then no evening
    // is free for everyone (L2-075 AC2).
    [Fact]
    public async Task The_summary_says_when_no_evening_is_free_for_everyone()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Jun Park");
        for (var i = 0; i < 7; i++)
        {
            await api.SetHoursAsync(lakeside.Id, "Jun Park", Saturday.AddDays(i), ("14:00", "22:00"));
        }

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/summary?from=2026-09-12");

        Assert.True(summary.GetProperty("hasHours").GetBoolean());
        Assert.Equal(JsonValueKind.Null, summary.GetProperty("day").ValueKind);
        Assert.Equal(JsonValueKind.Null, summary.GetProperty("everyoneFreeFrom").ValueKind);
    }

    // Given nobody has entered hours in the seven days, though Jun has some the week after, when
    // the summary is read, then it has no hours, and the home leaves the section out (L2-075 AC3).
    [Fact]
    public async Task A_week_with_no_hours_has_nothing_to_show()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Jun Park");
        await api.SetHoursAsync(lakeside.Id, "Jun Park", Saturday.AddDays(7), ("14:00", "22:00"));

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/summary?from=2026-09-12");

        Assert.False(summary.GetProperty("hasHours").GetBoolean());
    }

    // Given a person who is not a member, when they ask for the summary, then the Popkin is not
    // found (L2-051).
    [Fact]
    public async Task Someone_who_is_not_a_member_cannot_read_the_summary()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortiz", "(415) 555-0199");

        var response = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/schedule/summary?from=2026-09-12");

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
