using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// Reading this week: seven days from the viewer's today, how many are free each evening, when
/// everyone is free and who is last off shift, and each member's working stretches (L2-074 AC1 to
/// AC4, AC9).
/// </summary>
public sealed class ThisWeekReadTests
{
    private static readonly DateOnly Sunday = new(2026, 9, 13);
    private static readonly DateOnly Wednesday = new(2026, 9, 16);

    // Given Mara works 9 am to 5:30 pm and Priya 9 am to 7:30 pm on Wednesday, and Jun has no
    // hours, when Mara reads this week from Saturday 12 September, then Wednesday is "3 free",
    // everyone free from 19:30 with Priya the last off shift, and the members' stretches are given
    // as times.
    [Fact]
    public async Task A_member_reads_seven_evenings_and_everyones_working_hours()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");
        await api.SetHoursAsync(lakeside.Id, "Mara Okafor", Wednesday, ("09:00", "17:30"));
        await api.SetHoursAsync(lakeside.Id, "Priya Shah", Wednesday, ("09:00", "19:30"));

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        Assert.Equal("2026-09-12", week.GetProperty("from").GetString());
        Assert.Equal(3, week.GetProperty("memberCount").GetInt32());
        Assert.True(week.GetProperty("canEdit").GetBoolean());
        var days = week.GetProperty("days").EnumerateArray().ToList();
        Assert.Equal(
            ["2026-09-12", "2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18"],
            days.Select(d => d.GetProperty("date").GetString()));
        var wednesday = days[4];
        Assert.Equal(3, wednesday.GetProperty("freeCount").GetInt32());
        Assert.Equal("19:30", wednesday.GetProperty("everyoneFreeFrom").GetString());
        Assert.Equal(["Priya"], Names(wednesday, "lastOffShift"));
        Assert.Empty(Names(wednesday, "working"));
        var members = week.GetProperty("members").EnumerateArray().ToList();
        Assert.Equal(["Mara", "Priya", "Jun"], members.Select(m => m.GetProperty("firstName").GetString()));
        Assert.Equal([true, false, false], members.Select(m => m.GetProperty("isMe").GetBoolean()));
        Assert.Equal(["09:00-17:30"], StretchesOf(members[0], 4));
        Assert.Empty(StretchesOf(members[0], 3));
        Assert.Empty(StretchesOf(members[2], 4));
    }

    // Given Jun works 2 pm to 10 pm on Sunday, when Mara reads this week, then Sunday is "2 free",
    // with Jun working and no time everyone is free from (L2-074 AC4).
    [Fact]
    public async Task An_evening_someone_works_names_who_is_working()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");
        await api.SetHoursAsync(lakeside.Id, "Jun Park", Sunday, ("14:00", "22:00"));

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        var sunday = week.GetProperty("days")[1];
        Assert.Equal(2, sunday.GetProperty("freeCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, sunday.GetProperty("everyoneFreeFrom").ValueKind);
        Assert.Equal(["Jun"], Names(sunday, "working"));
    }

    // Given a stretch ends at midnight, when it is read, then its end is "24:00".
    [Fact]
    public async Task A_stretch_that_ends_at_midnight_reads_24_00()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.SetHoursAsync(lakeside.Id, "Mara Okafor", Sunday, ("06:00", "10:00"), ("18:00", "24:00"));

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        Assert.Equal(["06:00-10:00", "18:00-24:00"], StretchesOf(week.GetProperty("members")[0], 1));
    }

    // Given nobody has entered hours, when this week is read, then every evening has every member
    // free, from 5 pm, with nobody named (L2-074 AC9).
    [Fact]
    public async Task With_nobodys_hours_everyone_is_free_every_evening()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah");

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        Assert.All(week.GetProperty("days").EnumerateArray(), day =>
        {
            Assert.Equal(2, day.GetProperty("freeCount").GetInt32());
            Assert.Equal("17:00", day.GetProperty("everyoneFreeFrom").GetString());
            Assert.Empty(Names(day, "lastOffShift"));
        });
    }

    // Given no `from`, when this week is read, then it starts on the server's date.
    [Fact]
    public async Task Without_from_the_week_starts_today()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(new DateTimeOffset(2027, 3, 3, 12, 0, 0, TimeSpan.Zero));
        var lakeside = await api.StartLakesideAsync();

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week");

        Assert.Equal("2027-03-03", week.GetProperty("from").GetString());
    }

    // Given a member who has left had hours, when this week is read, then they are neither a row
    // nor counted.
    [Fact]
    public async Task A_member_who_has_left_is_not_counted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Shah", "Jun Park");
        await api.SetHoursAsync(lakeside.Id, "Jun Park", Sunday, ("14:00", "22:00"));
        await api.LeaveAsync(lakeside.Id, "Jun Park");

        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        Assert.Equal(2, week.GetProperty("memberCount").GetInt32());
        Assert.Equal(2, week.GetProperty("days")[1].GetProperty("freeCount").GetInt32());
    }

    // Given someone who is not a member, when they read this week, then the Popkin is not found.
    [Fact]
    public async Task A_stranger_cannot_read_this_week()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortiz", "(415) 555-0199");

        var response = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/schedule/week?from=2026-09-12");

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }

    private static List<string?> Names(JsonElement day, string property) =>
        day.GetProperty(property).EnumerateArray().Select(n => n.GetString()).ToList();

    private static List<string> StretchesOf(JsonElement member, int day) =>
        member.GetProperty("days")[day].EnumerateArray()
            .Select(s => $"{s.GetProperty("start").GetString()}-{s.GetProperty("end").GetString()}")
            .ToList();
}
