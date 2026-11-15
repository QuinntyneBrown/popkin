using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// Setting the event: the Host says what the group is getting together for and on which days, so
/// time off marks it; the Host alone, in an active Popkin, and up to a year ahead (L2-085).
/// </summary>
public sealed class SetEventTests
{
    private static readonly DateTimeOffset Wednesday = new(2027, 2, 17, 12, 0, 0, TimeSpan.Zero);

    // Given the Host, when they set "Cabin week" from Feb 15 to 19, then the answer is the event
    // and time off opens on its week with its label (L2-085 AC4, L2-072 AC3).
    [Fact]
    public async Task The_Host_sets_the_event_and_time_off_shows_it()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/event",
            new { label = "  Cabin week ", firstDay = "2027-02-15", lastDay = "2027-02-19" });
        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Cabin week", saved.GetProperty("label").GetString());
        Assert.Equal("2027-02-15", saved.GetProperty("firstDay").GetString());
        Assert.Equal("2027-02-19", saved.GetProperty("lastDay").GetString());
        Assert.Equal("2027-02-15", week.GetProperty("week").GetString());
        Assert.Equal("Cabin week", week.GetProperty("event").GetProperty("label").GetString());
    }

    // Given an event, when a member reads the Popkin's header, then it carries the event, which
    // "Popkin settings" shows (L2-085 AC1); while Schedules is off, the header leaves it out and
    // the event is kept (L2-077 AC5).
    [Theory]
    [InlineData("true")]
    [InlineData("false")]
    public async Task The_header_carries_the_event_while_Schedules_is_on(string schedules)
    {
        using var api = new ApiFactory();
        if (schedules == "false")
        {
            await api.SwitchFeatureAsync(Feature.Schedules, FeatureMode.Off);
        }

        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        await api.SetEventAsync(lakeside.Id, "Cabin week", new DateOnly(2027, 2, 15), new DateOnly(2027, 2, 19));

        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");

        var shown = header.GetProperty("event");
        if (schedules == "true")
        {
            Assert.Equal("Cabin week", shown.GetProperty("label").GetString());
            Assert.Equal("2027-02-15", shown.GetProperty("firstDay").GetString());
            Assert.Equal("2027-02-19", shown.GetProperty("lastDay").GetString());
        }
        else
        {
            Assert.Equal(JsonValueKind.Null, shown.ValueKind);
        }
    }

    // Given an event, when the Host removes it, then the Popkin has none (L2-085 AC5).
    [Fact]
    public async Task The_Host_removes_the_event()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        await api.SetEventAsync(lakeside.Id, "Cabin week", new DateOnly(2027, 2, 15), new DateOnly(2027, 2, 19));

        var response = await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/event");
        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?today=2027-03-03");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(JsonValueKind.Null, week.GetProperty("event").ValueKind);
        Assert.Equal("2027-03-01", week.GetProperty("week").GetString());
    }

    // Given Joel has the Popkin open, when the Host sets the event, then he hears ScheduleChanged,
    // so his time off reads again (L2-085 AC4).
    [Fact]
    public async Task Every_member_hears_that_the_event_changed()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/event",
            new { label = "Cabin week", firstDay = "2027-02-15", lastDay = "2027-02-19" });

        var changed = await joelHub.WaitForAsync("ScheduleChanged");
        Assert.Equal(lakeside.Id, changed.Arguments[0].GetGuid());
    }

    // Given a member who is not the Host, when they set or remove the event, then it is refused
    // with 403 (L2-085 AC6).
    [Theory]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Only_the_Host_sets_the_event(string method)
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");

        var response = await joel.SendAsync(EventRequest(method, lakeside.Id));

        await response.AssertProblem(HttpStatusCode.Forbidden, "host_only");
    }

    // Given a wrapped-up Popkin, when the Host sets or removes the event, then it is refused with
    // 409 (L2-085 AC6).
    [Theory]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Nothing_is_set_in_a_wrapped_up_Popkin(string method)
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.SendAsync(EventRequest(method, lakeside.Id));

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    // Given Schedules is off, when the Host sets the event, then it is refused with 404
    // `feature_off` (L2-085 AC6).
    [Fact]
    public async Task While_Schedules_is_off_the_event_is_not_set()
    {
        using var api = new ApiFactory();
        await api.SwitchFeatureAsync(Feature.Schedules, FeatureMode.Off);
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.SendAsync(EventRequest("PUT", lakeside.Id));

        await response.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    // Given an empty label, a label over 40 characters, a last day before the first, or a first
    // day more than a year ahead, when the Host saves, then it is refused with 400
    // `invalid_event` on the field at fault (L2-085 AC2, AC3).
    [Theory]
    [InlineData("   ", "2027-02-15", "2027-02-19", "label")]
    [InlineData("Cabin week at the lake with everyone, all five", "2027-02-15", "2027-02-19", "label")]
    [InlineData("Cabin week", "2027-02-19", "2027-02-15", "lastDay")]
    [InlineData("Cabin week", "2028-02-18", "2028-02-20", "firstDay")]
    public async Task An_event_that_breaks_a_rule_is_refused(string label, string firstDay, string lastDay, string field)
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/event", new { label, firstDay, lastDay });

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "invalid_event");
        Assert.Equal(field, problem.GetProperty("field").GetString());
    }

    private static HttpRequestMessage EventRequest(string method, Guid popkinId) =>
        new(new HttpMethod(method), $"/api/popkins/{popkinId}/event")
        {
            Content = method == "PUT"
                ? JsonContent.Create(new { label = "Cabin week", firstDay = "2027-02-15", lastDay = "2027-02-19" })
                : null,
        };
}
