// Acceptance Test
// Traces to: L2-125, L2-122, known gaps 99 and 111 (ruled)
// Description: Today leads with the next date, lists what is coming up within 60 days (four at most), the follow-ups due and the habit overdue, the five latest entries, and who has drifted past 30 days, from the owner's Contacts only.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class TodayTests
{
    private static DateOnly ClockDay(ApiFactory api) => DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);

    private static string Day(DateOnly day) => day.ToString("yyyy-MM-dd");

    private static async Task<Guid> ContactAsync(HttpClient owner, string name, string? knownAs = null, string? phone = null)
    {
        var response = await owner.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name,
            knownAs = knownAs ?? "",
            phone = phone ?? "",
            loves = new[] { "Pottery", "Natural wine" },
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task DateAsync(HttpClient owner, Guid contact, DateOnly on, string kind = "Birthday", string? title = null, int? year = null) =>
        (await owner.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
        {
            clientId = Guid.NewGuid(),
            kind,
            title,
            month = on.Month,
            day = on.Day,
            year,
            everyYear = true,
            lead = "OnTheDay",
        })).EnsureSuccessStatusCode();

    private static async Task TalkAsync(ApiFactory api, HttpClient owner, Guid contact, int daysAgo, string note) =>
        (await owner.PostAsJsonAsync($"/api/contacts/people/{contact}/conversations", new
        {
            clientId = Guid.NewGuid(),
            channel = "Phone",
            loggedAt = api.Clock.GetUtcNow().AddDays(-daysAgo),
            note,
            promises = Array.Empty<object>(),
        })).EnsureSuccessStatusCode();

    private static string[] FirstNames(JsonElement rows, string property = "firstName") =>
        rows.EnumerateArray().Select(r => r.GetProperty(property).GetString()!).ToArray();

    // Given Mara's people ten days on, when Today opens, then it leads with Grace's birthday in 4 days
    // with what she loves and the first sentence of their last talk, lists four dates coming up
    // within 60 days, the follow-ups due most late first, Lunch with Chidi overdue, the five latest
    // entries, and Sam and Joel drifting, not Ben (L2-125 AC2 to AC7).
    [Fact]
    public async Task Today_leads_with_the_next_date_and_holds_the_day()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var on = ClockDay(api).AddDays(10);
        var grace = await ContactAsync(mara, "Grace Adeyemi", "Best friend from uni", "+44 7700 900111");
        var chidi = await ContactAsync(mara, "Chidi Okafor");
        var ada = await ContactAsync(mara, "Ada Okafor");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        var dev = await ContactAsync(mara, "Dev Patel");
        var ben = await ContactAsync(mara, "Ben Hale");
        var walt = await ContactAsync(mara, "Walt Brennan");
        var sam = await ContactAsync(mara, "Sam Ortega");
        var joel = await ContactAsync(mara, "Joel Kim");
        await DateAsync(mara, grace, on.AddDays(4), year: 1993);
        await DateAsync(mara, chidi, on.AddDays(11), "Anniversary", "Chidi & Tomás’s anniversary");
        await DateAsync(mara, ada, on.AddDays(22));
        await DateAsync(mara, ruth, on.AddDays(39));
        await DateAsync(mara, dev, on.AddDays(45));
        await DateAsync(mara, ben, on.AddDays(50));
        await DateAsync(mara, walt, on.AddDays(62));
        await TalkAsync(api, mara, sam, 49, "Talked about the league.");
        await TalkAsync(api, mara, joel, 23, "Thursday plans.");
        await TalkAsync(api, mara, ben, 3, "Iris is sleeping better.");
        await TalkAsync(api, mara, grace, 1, "Venue’s booked. She asked if I’d do a reading.");
        await TalkAsync(api, mara, ada, 0, "Knee is better since physio.");
        await TalkAsync(api, mara, ruth, 2, "Tomatoes and the ladder.");
        (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(), text = "Return Ruth’s ladder", contactId = ruth, dueOn = Day(on),
        })).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(), text = "Introduce Dev to Priya", contactId = dev, dueOn = Day(on.AddDays(-2)),
        })).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(), text = "Book the venue", contactId = grace, dueOn = Day(on.AddDays(3)),
        })).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync("/api/contacts/habits", new
        {
            clientId = Guid.NewGuid(), contactId = chidi, what = "Lunch", rhythm = "Weekly",
        })).EnsureSuccessStatusCode();

        var today = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/today?on={Day(on)}");

        Assert.Equal("Mara", today.GetProperty("firstName").GetString());
        Assert.Equal(9, today.GetProperty("people").GetInt32());
        var next = today.GetProperty("next");
        Assert.Equal("Grace", next.GetProperty("date").GetProperty("firstName").GetString());
        Assert.Equal(4, next.GetProperty("date").GetProperty("daysLeft").GetInt32());
        Assert.Equal("Best friend from uni", next.GetProperty("knownAs").GetString());
        Assert.Equal("+44 7700 900111", next.GetProperty("phone").GetString());
        Assert.Equal("Venue’s booked.", next.GetProperty("lastTime").GetString());
        Assert.Equal(["Chidi", "Ada", "Ruth", "Dev"], FirstNames(today.GetProperty("comingUp")));
        Assert.Equal(["Introduce Dev to Priya", "Return Ruth’s ladder"],
            today.GetProperty("followUps").EnumerateArray().Select(f => f.GetProperty("text").GetString()!).ToArray());
        Assert.Equal(["Chidi"], FirstNames(today.GetProperty("overdueHabits"), "contactFirstName"));
        Assert.Equal(["Ada", "Grace", "Ruth", "Ben", "Joel"], FirstNames(today.GetProperty("recently")));
        Assert.Equal(["Sam", "Joel"], FirstNames(today.GetProperty("drifting")));
        Assert.Equal(59, today.GetProperty("drifting")[0].GetProperty("daysSince").GetInt32());
    }

    // Lena's Contacts add nothing to Mara's Today, and with nobody, Today says people 0 (L2-122, L2-125 AC8).
    [Fact]
    public async Task Only_the_owner_s_Contacts_are_read()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0190");
        var hers = await ContactAsync(lena, "Grace Adeyemi");
        await DateAsync(lena, hers, ClockDay(api).AddDays(2));

        var today = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/today?on={Day(ClockDay(api))}");

        Assert.Equal(0, today.GetProperty("people").GetInt32());
        Assert.Equal(JsonValueKind.Null, today.GetProperty("next").ValueKind);
        Assert.Empty(today.GetProperty("comingUp").EnumerateArray());
    }

    // A day the device cannot have is refused (L2-125).
    [Fact]
    public async Task A_day_that_is_not_one_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.GetAsync("/api/contacts/today?on=2026-02-30");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_date", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }
}
