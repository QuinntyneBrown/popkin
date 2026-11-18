using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Administration;

/// <summary>Confirm and publish holiday dates (L2-197).</summary>
public sealed class AdminHolidayDatesTests
{
    private static async Task<(Guid Calendar, Guid Ramadan, Guid Christmas, int Next)> IslamicAsync(ApiFactory api)
    {
        var thisYear = api.Clock.GetUtcNow().Year;
        var next = thisYear + 1;
        var calendar = await api.AddHolidayCalendarAsync(
            "Islamic holidays", "Ramadan", "Moon sighting, confirmed by hand", [thisYear],
            new ArrangedHoliday("Ramadan begins", new DateOnly(next, 2, 18), HolidayStatus.Estimated, "Could be 19 Feb"),
            new ArrangedHoliday("Eid al-Fitr", new DateOnly(next, 3, 20), HolidayStatus.Estimated),
            new ArrangedHoliday("New Year", new DateOnly(next, 1, 1), HolidayStatus.ByRule));
        var holidays = (await (await api.SignedInOwnerAsync()).GetFromJsonAsync<JsonElement>($"/api/admin/holiday-calendars/{calendar}?year={next}"))
            .GetProperty("holidays").EnumerateArray().ToDictionary(h => h.GetProperty("name").GetString()!, h => h.GetProperty("id").GetGuid());
        return (calendar, holidays["Ramadan begins"], holidays["New Year"], next);
    }

    // Given an estimated date, when Support changes it, then it is Confirmed on the new date, the
    // calendar's Last edited is theirs, and the audit log holds one entry with no reason (AC1, AC5).
    [Fact]
    public async Task Support_changes_an_estimate_and_it_is_confirmed()
    {
        using var api = new ApiFactory();
        var (calendar, ramadan, _, next) = await IslamicAsync(api);
        var owner = await api.SignedInOwnerAsync();
        var (support, _) = await api.SignedInAdminAsync(owner, "kwame.mensah@popkin.app", "Support");

        var response = await support.PutAsJsonAsync($"/api/admin/holiday-calendars/{calendar}/holidays/{ramadan}", new { date = $"{next}-02-19" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var holiday = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal($"{next}-02-19", holiday.GetProperty("date").GetString());
        Assert.Equal("Confirmed", holiday.GetProperty("status").GetString());
        var read = await owner.GetFromJsonAsync<JsonElement>($"/api/admin/holiday-calendars/{calendar}?year={next}");
        Assert.Equal(1, read.GetProperty("estimates").GetInt32());
        Assert.Equal("Kwame", read.GetProperty("lastEdited").GetProperty("adminName").GetString());
        var entry = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0];
        Assert.Equal("ChangedHolidayDate", entry.GetProperty("action").GetString());
        Assert.Equal("Islamic holidays", entry.GetProperty("targetName").GetString());
        Assert.Equal(JsonValueKind.Null, entry.GetProperty("reason").ValueKind);
        var details = JsonDocument.Parse(entry.GetProperty("details").GetString()!).RootElement;
        Assert.Equal("Ramadan begins", details.GetProperty("holiday").GetString());
        Assert.Equal($"{next}-02-18", details.GetProperty("old").GetString());
        Assert.Equal($"{next}-02-19", details.GetProperty("new").GetString());
    }

    // Given an estimate, when its own date is kept, then it is confirmed without moving (AC1).
    [Fact]
    public async Task The_same_date_confirms_an_estimate()
    {
        using var api = new ApiFactory();
        var (calendar, ramadan, _, next) = await IslamicAsync(api);
        var owner = await api.SignedInOwnerAsync();

        var holiday = await (await owner.PutAsJsonAsync($"/api/admin/holiday-calendars/{calendar}/holidays/{ramadan}", new { date = $"{next}-02-18" }))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal($"{next}-02-18", holiday.GetProperty("date").GetString());
        Assert.Equal("Confirmed", holiday.GetProperty("status").GetString());
    }

    // Given a holiday by rule, a date in another year, an unknown holiday or a Viewer, when a date
    // is changed, then it is refused and nothing changes (AC1, AC5).
    [Fact]
    public async Task A_change_is_refused_by_rule_outside_the_year_or_for_a_viewer()
    {
        using var api = new ApiFactory();
        var (calendar, ramadan, newYear, next) = await IslamicAsync(api);
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");
        var path = $"/api/admin/holiday-calendars/{calendar}/holidays";

        await (await owner.PutAsJsonAsync($"{path}/{newYear}", new { date = $"{next}-01-02" })).AssertProblem(HttpStatusCode.Conflict, "holiday_by_rule");
        await (await owner.PutAsJsonAsync($"{path}/{ramadan}", new { date = $"{next + 1}-02-18" })).AssertProblem(HttpStatusCode.BadRequest, "invalid_date");
        await (await owner.PutAsJsonAsync($"{path}/{ramadan}", new { date = "soon" })).AssertProblem(HttpStatusCode.BadRequest, "invalid_date");
        await (await owner.PutAsJsonAsync($"{path}/{Guid.NewGuid()}", new { date = $"{next}-02-18" })).AssertProblem(HttpStatusCode.NotFound, "holiday_not_found");
        await (await viewer.PutAsJsonAsync($"{path}/{ramadan}", new { date = $"{next}-02-19" })).AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");

        var read = await owner.GetFromJsonAsync<JsonElement>($"/api/admin/holiday-calendars/{calendar}?year={next}");
        Assert.Equal(2, read.GetProperty("estimates").GetInt32());
    }

    // Given next year unpublished, when an Owner publishes it with a reason, then Dates through
    // becomes next year, the warning goes, the counts come back, and the audit log keeps the
    // reason (AC4).
    [Fact]
    public async Task An_owner_publishes_next_year_with_a_reason()
    {
        using var api = new ApiFactory();
        var (calendar, _, _, next) = await IslamicAsync(api);
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Joel");
        await api.ObserveHolidaysAsync(lakeside.Id, calendar);
        var owner = await api.SignedInOwnerAsync();

        var response = await owner.PostAsJsonAsync($"/api/admin/holiday-calendars/{calendar}/years/{next}/publish", new { reason = "Moon sighting committee dates" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var published = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Islamic holidays", published.GetProperty("calendarName").GetString());
        Assert.Equal(next, published.GetProperty("year").GetInt32());
        Assert.Equal(2, published.GetProperty("people").GetInt32());
        Assert.Equal(1, published.GetProperty("popkins").GetInt32());
        var row = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/holiday-calendars")).GetProperty("calendars")[0];
        Assert.Equal(next, row.GetProperty("datesThrough").GetInt32());
        Assert.False(row.GetProperty("needsDates").GetBoolean());
        Assert.Equal(0, (await owner.GetFromJsonAsync<JsonElement>("/api/admin/waiting")).GetProperty("holidayCalendars").GetInt32());
        var entry = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0];
        Assert.Equal("PublishedHolidayYear", entry.GetProperty("action").GetString());
        Assert.Equal("Moon sighting committee dates", entry.GetProperty("reason").GetString());
        var details = JsonDocument.Parse(entry.GetProperty("details").GetString()!).RootElement;
        Assert.Equal(next, details.GetProperty("year").GetInt32());
        Assert.Equal(3, details.GetProperty("dates").GetInt32());
        Assert.Equal(2, details.GetProperty("estimates").GetInt32());
    }

    // Given a publish without a reason, twice, of an empty year, or by a Viewer, when it is sent,
    // then it is refused (AC3, AC5).
    [Fact]
    public async Task A_publish_is_refused_without_a_reason_twice_empty_or_for_a_viewer()
    {
        using var api = new ApiFactory();
        var (calendar, _, _, next) = await IslamicAsync(api);
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");
        var path = $"/api/admin/holiday-calendars/{calendar}/years";

        await (await owner.PostAsJsonAsync($"{path}/{next}/publish", new { reason = " " })).AssertProblem(HttpStatusCode.BadRequest, "reason_required");
        await (await viewer.PostAsJsonAsync($"{path}/{next}/publish", new { reason = "Dates" })).AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        await (await owner.PostAsJsonAsync($"{path}/{next + 1}/publish", new { reason = "Dates" })).AssertProblem(HttpStatusCode.NotFound, "holiday_year_not_found");
        await (await owner.PostAsJsonAsync($"{path}/{next - 1}/publish", new { reason = "Dates" })).AssertProblem(HttpStatusCode.Conflict, "holiday_year_published");
        await (await owner.PostAsJsonAsync($"/api/admin/holiday-calendars/{Guid.NewGuid()}/years/{next}/publish", new { reason = "Dates" })).AssertProblem(HttpStatusCode.NotFound, "holiday_calendar_not_found");
    }

    // Given a year that exists with no holidays, when it is published, then it is refused.
    [Fact]
    public async Task An_empty_year_cannot_be_published()
    {
        using var api = new ApiFactory();
        var thisYear = api.Clock.GetUtcNow().Year;
        var calendar = await api.AddHolidayCalendarAsync("Australia", "National", "Fixed dates and rules", []);
        await api.AddHolidayYearAsync(calendar, thisYear + 1);
        var owner = await api.SignedInOwnerAsync();

        await (await owner.PostAsJsonAsync($"/api/admin/holiday-calendars/{calendar}/years/{thisYear + 1}/publish", new { reason = "Dates" }))
            .AssertProblem(HttpStatusCode.Conflict, "holiday_year_empty");
    }
}
