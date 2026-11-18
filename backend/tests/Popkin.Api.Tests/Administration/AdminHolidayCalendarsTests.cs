using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Administration;

/// <summary>Holiday calendars in the admin app (L2-196).</summary>
public sealed class AdminHolidayCalendarsTests
{
    // Given a calendar published through next year, one published through this year with members
    // in two Popkins, and a draft, when an admin opens Holiday calendars, then each reads its
    // people and "Dates through", the one through this year is warned, the draft is "Draft", and
    // the banner names the warned one with its distinct people (L2-196 AC2, AC3).
    [Fact]
    public async Task The_list_counts_people_and_warns_a_calendar_without_next_year()
    {
        using var api = new ApiFactory();
        var thisYear = api.Clock.GetUtcNow().Year;
        var us = await api.AddHolidayCalendarAsync("United States", "Federal and widely observed", "Fixed dates and rules", [thisYear, thisYear + 1]);
        var islamic = await api.AddHolidayCalendarAsync("Islamic holidays", "Ramadan, Eid al-Fitr, Eid al-Adha", "Moon sighting, confirmed by hand", [thisYear]);
        await api.AddHolidayCalendarAsync("Australia", "National public holidays", "Fixed dates and rules", []);
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Joel", "Priya");
        var other = await api.StartPopkinAsync("Kwame", "(415) 555-0150", "Sunday League");
        await api.AddMembersAsync(other.Id, "Ade");
        await api.ObserveHolidaysAsync(lakeside.Id, islamic);
        await api.ObserveHolidaysAsync(other.Id, islamic);
        var owner = await api.SignedInOwnerAsync();

        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/holiday-calendars");

        Assert.Equal(thisYear, page.GetProperty("thisYear").GetInt32());
        var rows = page.GetProperty("calendars").EnumerateArray().ToList();
        Assert.Equal(["United States", "Islamic holidays", "Australia"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal(us, rows[0].GetProperty("id").GetGuid());
        Assert.Equal("Federal and widely observed", rows[0].GetProperty("holds").GetString());
        Assert.Equal(0, rows[0].GetProperty("people").GetInt32());
        Assert.Equal(thisYear + 1, rows[0].GetProperty("datesThrough").GetInt32());
        Assert.False(rows[0].GetProperty("needsDates").GetBoolean());
        Assert.Equal(5, rows[1].GetProperty("people").GetInt32());
        Assert.Equal(thisYear, rows[1].GetProperty("datesThrough").GetInt32());
        Assert.True(rows[1].GetProperty("needsDates").GetBoolean());
        Assert.True(rows[2].GetProperty("draft").GetBoolean());
        Assert.Equal(JsonValueKind.Null, rows[2].GetProperty("datesThrough").ValueKind);
        Assert.False(rows[2].GetProperty("needsDates").GetBoolean());
        var banner = page.GetProperty("withoutNextYear");
        Assert.Equal(["Islamic holidays"], banner.GetProperty("names").EnumerateArray().Select(n => n.GetString()));
        Assert.Equal(5, banner.GetProperty("people").GetInt32());
    }

    // Given a person in two Popkins that observe two warned calendars, when the banner counts its
    // people, then that person is counted once; a member who left is not counted (L2-196 AC3).
    [Fact]
    public async Task The_banner_counts_each_person_once()
    {
        using var api = new ApiFactory();
        var thisYear = api.Clock.GetUtcNow().Year;
        var islamic = await api.AddHolidayCalendarAsync("Islamic holidays", "Ramadan", "Moon sighting", [thisYear]);
        var hindu = await api.AddHolidayCalendarAsync("Hindu festivals", "Holi, Diwali", "Lunar calendar", [thisYear - 1]);
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Joel");
        await api.LeaveAsync(lakeside.Id, "Joel");
        var other = await api.StartPopkinAsync("Kwame", "(415) 555-0150", "Sunday League");
        await api.ObserveHolidaysAsync(lakeside.Id, islamic);
        await api.ObserveHolidaysAsync(other.Id, hindu);
        var owner = await api.SignedInOwnerAsync();

        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/holiday-calendars");

        var banner = page.GetProperty("withoutNextYear");
        Assert.Equal(["Islamic holidays", "Hindu festivals"], banner.GetProperty("names").EnumerateArray().Select(n => n.GetString()));
        Assert.Equal(2, banner.GetProperty("people").GetInt32());
    }

    // Given no calendar is warned, when the page reads, then the banner names none.
    [Fact]
    public async Task No_banner_when_every_calendar_has_next_year()
    {
        using var api = new ApiFactory();
        var thisYear = api.Clock.GetUtcNow().Year;
        await api.AddHolidayCalendarAsync("United Kingdom", "Bank holidays", "Fixed dates and rules", [thisYear + 1]);
        var viewer = (await api.SignedInAdminAsync(await api.SignedInOwnerAsync(), "vic@popkin.app", "Viewer")).Client;

        var page = await viewer.GetFromJsonAsync<JsonElement>("/api/admin/holiday-calendars");

        Assert.Empty(page.GetProperty("withoutNextYear").GetProperty("names").EnumerateArray());
        Assert.Equal(0, page.GetProperty("withoutNextYear").GetProperty("people").GetInt32());
    }

    // Given a person signed in to the web app, when they ask for the calendars, then the admin
    // scheme refuses them.
    [Fact]
    public async Task A_web_app_session_cannot_read_the_calendars()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.GetAsync("/api/admin/holiday-calendars");

        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden });
    }

    // Given a calendar without next year's dates and a draft, when any admin reads what is
    // waiting, then holidayCalendars counts the warned one and not the draft (L2-196 AC1).
    [Fact]
    public async Task The_sidebar_counts_the_calendars_without_next_year()
    {
        using var api = new ApiFactory();
        var thisYear = api.Clock.GetUtcNow().Year;
        await api.AddHolidayCalendarAsync("Islamic holidays", "Ramadan", "Moon sighting", [thisYear]);
        await api.AddHolidayCalendarAsync("Jewish holidays", "Major festivals", "Hebrew calendar", [thisYear + 1]);
        await api.AddHolidayCalendarAsync("Australia", "National public holidays", "Fixed dates and rules", []);
        var owner = await api.SignedInOwnerAsync();

        var waiting = await owner.GetFromJsonAsync<JsonElement>("/api/admin/waiting");

        Assert.Equal(1, waiting.GetProperty("holidayCalendars").GetInt32());
    }
}
