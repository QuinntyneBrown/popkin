using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// Adding my time off: each member sets their own week, Monday to Friday, Off, Tentative or
/// Working; nobody sets another's, and nothing is set in a wrapped-up Popkin (L2-073).
/// </summary>
public sealed class AddTimeOffTests
{
    private static readonly DateTimeOffset Wednesday = new(2027, 2, 17, 12, 0, 0, TimeSpan.Zero);

    // Given Mara's week of Feb 15, when she saves Off, Off, Tentative, Working, Off, then the
    // answer is the week with her row so, and a read of the week shows the same (L2-073 AC2).
    [Fact]
    public async Task A_member_saves_their_week()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah");
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Tentative", "Working", "Off" } });
        var read = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        string[] expected = ["Off", "Off", "Tentative", "Working", "Off", "Weekend", "Weekend"];
        Assert.Equal(expected, DaysOf(saved, "Mara"));
        Assert.Equal(expected, DaysOf(read, "Mara"));
        Assert.Equal(["Working", "Working", "Working", "Working", "Working", "Weekend", "Weekend"], DaysOf(read, "Priya"));
    }

    // Given Mara and Joel each with the Popkin open, when Mara saves her time off, then both
    // hear ScheduleChanged naming the Popkin, so an open table reads its week again (L2-072 AC11).
    [Fact]
    public async Task Every_member_with_the_Popkin_open_hears_that_the_schedule_changed()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Off", "Off", "Off" } });

        foreach (var hub in new[] { maraHub, joelHub })
        {
            var changed = await hub.WaitForAsync("ScheduleChanged");
            Assert.Equal(lakeside.Id, changed.Arguments[0].GetGuid());
        }
    }

    // Given Mara is off on Monday, when she saves Working for it, then Monday is Working again.
    [Fact]
    public async Task Saving_Working_takes_a_day_off_back()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var url = $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}";
        await lakeside.Host.PutAsJsonAsync(url, new { week = "2027-02-15", days = new[] { "Off", "Off", "Off", "Off", "Off" } });

        var response = await lakeside.Host.PutAsJsonAsync(url, new { week = "2027-02-17", days = new[] { "Working", "Off", "Off", "Off", "Off" } });

        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2027-02-15", saved.GetProperty("week").GetString());
        Assert.Equal(["Working", "Off", "Off", "Off", "Off", "Weekend", "Weekend"], DaysOf(saved, "Mara"));
    }

    // Given Priya is a member, when Mara sets Priya's time off, then it is refused with 403
    // `not_your_schedule` and Priya's week is unchanged (L2-073 AC4).
    [Fact]
    public async Task Nobody_sets_another_members_time_off()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var priya = await api.SignedUpAsync("Priya Shah", "(415) 555-0177");
        (await priya.JoinAsync(lakeside.Code, "Priya Shah")).EnsureSuccessStatusCode();
        var priyaId = await priya.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{priyaId}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Off", "Off", "Off" } });

        await response.AssertProblem(HttpStatusCode.Forbidden, "not_your_schedule");
        var read = await priya.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");
        Assert.Equal("Working", DaysOf(read, "Priya")[0]);
    }

    // Given a wrapped-up Popkin, when a member saves time off, then it is refused with 409
    // `popkin_wrapped_up` (L2-073 AC4, L2-045 AC2).
    [Fact]
    public async Task Nothing_is_set_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Off", "Off", "Off" } });

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    // Given today is Wednesday 17 February 2027, when a member saves a week whose Monday is more
    // than a year ahead, then it is refused with 400 `too_far_ahead` on `week` (L2-073 AC5).
    [Fact]
    public async Task A_week_more_than_a_year_ahead_is_refused()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2028-02-21", days = new[] { "Off", "Off", "Off", "Off", "Off" } });

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "too_far_ahead");
        Assert.Equal("week", problem.GetProperty("field").GetString());
    }

    // Given the days are not five of Off, Tentative and Working, when a member saves them, then
    // they are refused with 400 `invalid_time_off` on `days`.
    [Theory]
    [InlineData("Off,Off,Off,Off")]
    [InlineData("Off,Off,Off,Off,Off,Off")]
    [InlineData("Off,Off,Weekend,Off,Off")]
    [InlineData("Off,Off,Holiday,Off,Off")]
    public async Task Days_that_are_not_five_known_choices_are_refused(string given)
    {
        var days = given.Split(',');
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-15", days });

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "invalid_time_off");
        Assert.Equal("days", problem.GetProperty("field").GetString());
    }

    // Given Joel has time off, when he leaves the Popkin, then his time off is gone with him
    // (L2-047, the Schedules design: leaving removes a member's time off).
    [Fact]
    public async Task Leaving_removes_the_members_time_off()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        (await joel.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{joelId}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Tentative", "Working", "Off" } })).EnsureSuccessStatusCode();

        (await joel.DeleteAsync($"/api/popkins/{lakeside.Id}/members/me")).EnsureSuccessStatusCode();

        Assert.Equal(0, api.TimeOffCount(joelId));
    }

    // Given Joel has time off, when he deletes his account, then his time off is removed with
    // his memberships (L2-049, the Schedules design).
    [Fact]
    public async Task Deleting_the_account_removes_the_members_time_off()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        (await joel.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/time-off/{joelId}",
            new { week = "2027-02-15", days = new[] { "Off", "Off", "Off", "Off", "Off" } })).EnsureSuccessStatusCode();

        (await joel.DeleteAsync("/api/account")).EnsureSuccessStatusCode();

        Assert.Equal(0, api.TimeOffCount(joelId));
    }

    private static string[] DaysOf(JsonElement week, string firstName) =>
        week.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("firstName").GetString() == firstName)
            .GetProperty("days").EnumerateArray().Select(d => d.GetString()!).ToArray();
}
