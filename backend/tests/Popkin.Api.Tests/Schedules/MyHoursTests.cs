using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// My hours: each member enters their own working hours for the seven days of this week, up to two
/// stretches a day on the quarter hour; nobody enters another's, and nothing is entered in a
/// wrapped-up Popkin (L2-074 AC8, L2-073 AC4).
/// </summary>
public sealed class MyHoursTests
{
    private static readonly DateTimeOffset Saturday = new(2027, 3, 6, 12, 0, 0, TimeSpan.Zero);
    private const string From = "2027-03-06";

    private static object[][] Week(params (int Day, string Start, string End)[] stretches) =>
        Enumerable.Range(0, 7)
            .Select(day => stretches.Where(s => s.Day == day).Select(s => (object)new { start = s.Start, end = s.End }).ToArray())
            .ToArray();

    // Given Mara's this week from Saturday 6 March, when she saves 9 am to 5:30 pm on Wednesday and
    // two stretches on Sunday, then the answer is this week with her hours, and a read gives the same.
    [Fact]
    public async Task A_member_saves_their_hours_for_the_seven_days()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = From, days = Week((1, "06:00", "10:00"), (1, "18:00", "24:00"), (4, "09:00", "17:30")) });
        var read = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/week?from={From}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var week in new[] { saved, read })
        {
            Assert.Equal(From, week.GetProperty("from").GetString());
            var me = week.GetProperty("members")[0];
            Assert.Equal(["06:00-10:00", "18:00-24:00"], StretchesOf(me, 1));
            Assert.Equal(["09:00-17:30"], StretchesOf(me, 4));
            Assert.Empty(StretchesOf(me, 0));
        }

        Assert.Equal(["Mara"], NamesOf(saved, 1, "working"));
    }

    // Given Mara works on Wednesday, when she saves the week with Wednesday blank, then she is not
    // working on Wednesday.
    [Fact]
    public async Task A_blank_day_takes_the_hours_back()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var url = $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}";
        await lakeside.Host.PutAsJsonAsync(url, new { from = From, days = Week((4, "09:00", "17:30")) });

        var response = await lakeside.Host.PutAsJsonAsync(url, new { from = From, days = Week() });

        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Empty(StretchesOf(saved.GetProperty("members")[0], 4));
    }

    // Given Mara and Joel each with the Popkin open, when Mara saves her hours, then both hear
    // ScheduleChanged, so an open this week reads again.
    [Fact]
    public async Task Every_member_with_the_Popkin_open_hears_that_the_schedule_changed()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = From, days = Week((4, "09:00", "17:30")) });

        var changed = await joelHub.WaitForAsync("ScheduleChanged");
        Assert.Equal(lakeside.Id, changed.Arguments[0].GetGuid());
    }

    // Given Priya is a member, when Mara sets Priya's hours, then it is refused with 403
    // `not_your_schedule`.
    [Fact]
    public async Task Nobody_sets_another_members_hours()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var priya = await api.JoinedAsync(lakeside.Code, "Priya Shah", "(415) 555-0177");
        var priyaId = await priya.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{priyaId}",
            new { from = From, days = Week((4, "09:00", "17:30")) });

        await response.AssertProblem(HttpStatusCode.Forbidden, "not_your_schedule");
        Assert.Equal(0, api.WorkingStretchCount(priyaId));
    }

    // Given a wrapped-up Popkin, when a member saves hours, then it is refused with 409.
    [Fact]
    public async Task Nothing_is_set_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = From, days = Week((4, "09:00", "17:30")) });

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    // Given hours that break the rules of a day, when a member saves them, then they are refused
    // with 400 `invalid_hours` on `days`, and nothing is saved (L2-074 AC8).
    [Theory]
    [InlineData("09:10", "17:00")] // not on the quarter hour
    [InlineData("17:00", "09:00")] // ends before it starts
    [InlineData("9:00", "17:00")] // not a time
    [InlineData("09:00", "24:15")] // past the end of the day
    public async Task Hours_that_break_the_rules_are_refused(string start, string end)
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = From, days = Week((2, "06:00", "08:00"), (4, start, end)) });

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "invalid_hours");
        Assert.Equal("days", problem.GetProperty("field").GetString());
        Assert.Equal(0, api.WorkingStretchCount(mara));
    }

    // Given a week of six days, or three stretches on a day, when it is saved, then it is refused.
    [Fact]
    public async Task A_week_is_seven_days_of_at_most_two_stretches()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var url = $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}";

        var six = await lakeside.Host.PutAsJsonAsync(url, new { from = From, days = Week().Take(6).ToArray() });
        var three = await lakeside.Host.PutAsJsonAsync(
            url, new { from = From, days = Week((0, "06:00", "07:00"), (0, "08:00", "09:00"), (0, "10:00", "11:00")) });

        await six.AssertProblem(HttpStatusCode.BadRequest, "invalid_hours");
        await three.AssertProblem(HttpStatusCode.BadRequest, "invalid_hours");
    }

    // Given today is Saturday 6 March 2027, when a member saves hours from a day more than a year
    // ahead, then it is refused with 400 `too_far_ahead` on `from` (L2-073 AC5).
    [Fact]
    public async Task Hours_more_than_a_year_ahead_are_refused()
    {
        using var api = new ApiFactory();
        api.Clock.SetUtcNow(Saturday);
        var lakeside = await api.StartLakesideAsync();
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/schedule/hours/{mara}",
            new { from = "2028-03-10", days = Week((4, "09:00", "17:30")) });

        var problem = await response.AssertProblem(HttpStatusCode.BadRequest, "too_far_ahead");
        Assert.Equal("from", problem.GetProperty("field").GetString());
    }

    private static List<string?> NamesOf(JsonElement week, int day, string property) =>
        week.GetProperty("days")[day].GetProperty(property).EnumerateArray().Select(n => n.GetString()).ToList();

    private static List<string> StretchesOf(JsonElement member, int day) =>
        member.GetProperty("days")[day].EnumerateArray()
            .Select(s => $"{s.GetProperty("start").GetString()}-{s.GetProperty("end").GetString()}")
            .ToList();
}
