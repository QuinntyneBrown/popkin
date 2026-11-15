using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// Reading a week of time off: a row per member who has not left, Monday to Sunday, every
/// weekday Working until a member says otherwise (L2-072 AC2, AC4, AC10, L2-051).
/// </summary>
public sealed class TimeOffReadTests
{
    // Given Mara's Popkin with Priya and Jun, and nobody's time off, when Mara reads the week of
    // Wednesday 17 February 2027, then she gets the week of Monday 15 February: Mara, Priya and Jun
    // by first name, Mara marked as herself, five Working days and a weekend each, and no event.
    [Fact]
    public async Task A_member_reads_a_week_with_nobodys_time_off()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-17");

        Assert.Equal("2027-02-15", week.GetProperty("week").GetString());
        Assert.Equal(JsonValueKind.Null, week.GetProperty("event").ValueKind);
        Assert.True(week.GetProperty("canEdit").GetBoolean());
        var members = week.GetProperty("members").EnumerateArray().ToList();
        Assert.Equal(["Mara", "Priya", "Jun"], members.Select(m => m.GetProperty("firstName").GetString()));
        Assert.Equal([true, false, false], members.Select(m => m.GetProperty("isMe").GetBoolean()));
        Assert.All(members, m => Assert.Equal(
            ["Working", "Working", "Working", "Working", "Working", "Weekend", "Weekend"],
            m.GetProperty("days").EnumerateArray().Select(d => d.GetString())));
        Assert.True(members[0].GetProperty("avatar").TryGetProperty("initials", out _));
        Assert.False(members[0].TryGetProperty("contact", out _));
    }

    // Given a member has left, when another reads time off, then the one who left is not a row.
    [Fact]
    public async Task A_member_who_has_left_is_not_a_row()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");
        await api.LeaveAsync(lakeside.Id, "Jun Park");

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");

        Assert.Equal(["Mara", "Priya"], week.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("firstName").GetString()));
    }

    // Given a week is not named and the Popkin has no event, when a member reads time off, then
    // the answer is the week of the server's date.
    [Fact]
    public async Task Without_a_week_the_answer_is_the_current_week()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(new DateTimeOffset(2027, 2, 18, 12, 0, 0, TimeSpan.Zero));
        var lakeside = await api.StartLakesideAsync();

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off");

        Assert.Equal("2027-02-15", week.GetProperty("week").GetString());
    }

    // Given no week is chosen and the Popkin has no event, when the app sends the viewer's own
    // today, then the answer is the week of that day, whatever the server's date (L2-072 AC8).
    [Fact]
    public async Task Without_a_week_the_answer_is_the_week_of_the_viewers_today()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(new DateTimeOffset(2027, 2, 22, 2, 0, 0, TimeSpan.Zero));
        var lakeside = await api.StartLakesideAsync();

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?today=2027-02-21");

        Assert.Equal("2027-02-15", week.GetProperty("week").GetString());
    }

    // Given the Popkin has an event, when no week is chosen, then the answer is the event's week
    // and carries the event (L2-072 AC8).
    [Fact]
    public async Task Without_a_week_the_answer_is_the_events_week()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(new DateTimeOffset(2027, 1, 4, 12, 0, 0, TimeSpan.Zero));
        var lakeside = await api.StartLakesideAsync();
        await api.SetEventAsync(lakeside.Id, "Cabin week", new DateOnly(2027, 2, 15), new DateOnly(2027, 2, 19));

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?today=2027-01-04");

        Assert.Equal("2027-02-15", week.GetProperty("week").GetString());
        var theEvent = week.GetProperty("event");
        Assert.Equal("Cabin week", theEvent.GetProperty("label").GetString());
        Assert.Equal("2027-02-15", theEvent.GetProperty("firstDay").GetString());
        Assert.Equal("2027-02-19", theEvent.GetProperty("lastDay").GetString());
    }

    // Given a person who is not a member, when they ask for a Popkin's time off, then the answer
    // is 404 `popkin_not_found` (L2-051).
    [Fact]
    public async Task A_stranger_learns_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");

        var response = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
