using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The People view lists the caller's birthdays and changes each one's reminder through the one
/// endpoint Dates and the profile use (birthday-reminders-by-person; L2-159, L2-139 AC5).
/// </summary>
public sealed class BirthdayRemindersByPersonTests
{
    private static async Task<Guid> BirthdayAsync(HttpClient owner, string name, DateOnly on, int? year, string kind = "Birthday")
    {
        var contact = (await owner.AddedContactAsync(name)).GetProperty("id").GetGuid();
        var date = await owner.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
        {
            clientId = Guid.NewGuid(),
            kind,
            month = on.Month,
            day = on.Day,
            year,
            everyYear = true,
            lead = "OneWeekBefore",
        });
        date.EnsureSuccessStatusCode();
        return (await date.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static DateOnly Today(ApiFactory api) => DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);

    // Given Mara with Ruth's birthday in 20 days, Grace's in 3 (with a year) and Chidi's anniversary,
    // and Lena with a birthday of her own, when Mara reads her settings, then she sees her two
    // birthdays soonest first with their day, age, days left, lead and switch, and nothing of
    // Lena's or of the anniversary (L2-159 AC1, AC2; L2-122).
    [Fact]
    public async Task The_People_view_lists_my_birthdays_soonest_first()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var today = Today(api);
        var ruth = await BirthdayAsync(mara, "Ruth Bell", today.AddDays(20), year: null);
        var grace = await BirthdayAsync(mara, "Grace Adeyemi", today.AddDays(3), today.AddDays(3).Year - 33);
        await BirthdayAsync(mara, "Chidi Okafor", today.AddDays(1), 2021, kind: "Anniversary");
        await BirthdayAsync(lena, "Bea Fischer", today.AddDays(2), year: null);

        var read = await mara.GetFromJsonAsync<JsonElement>("/api/me/notifications");

        var birthdays = read.GetProperty("birthdays").EnumerateArray().ToList();
        Assert.Equal(2, read.GetProperty("birthdayCount").GetInt32());
        Assert.Equal([grace, ruth], birthdays.Select(b => b.GetProperty("keyDateId").GetGuid()));
        var first = birthdays[0];
        Assert.Equal("Grace Adeyemi", first.GetProperty("name").GetString());
        Assert.Equal("GA", first.GetProperty("initials").GetString());
        Assert.Equal(today.AddDays(3).ToString("yyyy-MM-dd"), first.GetProperty("occursOn").GetString());
        Assert.Equal(33, first.GetProperty("turns").GetInt32());
        Assert.Equal(3, first.GetProperty("inDays").GetInt32());
        Assert.Equal("OneWeekBefore", first.GetProperty("lead").GetString());
        Assert.True(first.GetProperty("remindersOn").GetBoolean());
        Assert.Equal(JsonValueKind.Null, birthdays[1].GetProperty("turns").ValueKind);
    }

    // When Mara turns Grace's reminder off, then the People view and Dates both read it off with
    // its lead kept, and turning it on brings the lead back; a lead changed here shows on Dates
    // (L2-159 AC3, AC4; L2-139 AC5).
    [Fact]
    public async Task A_switch_and_a_lead_changed_here_are_the_dates_own()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await BirthdayAsync(mara, "Grace Adeyemi", Today(api).AddDays(3), year: null);

        var off = await mara.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { on = false });
        var settings = await mara.GetFromJsonAsync<JsonElement>("/api/me/notifications");
        var lead = await mara.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { lead = "TwoWeeksBefore", on = true });
        var dates = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/dates?on={Today(api):yyyy-MM-dd}");

        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        var offDto = await off.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(offDto.GetProperty("remindersOn").GetBoolean());
        Assert.Equal("OneWeekBefore", offDto.GetProperty("reminder").GetString());
        var row = settings.GetProperty("birthdays")[0];
        Assert.False(row.GetProperty("remindersOn").GetBoolean());
        Assert.Equal("OneWeekBefore", row.GetProperty("lead").GetString());
        Assert.True((await lead.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("remindersOn").GetBoolean());
        Assert.Equal("TwoWeeksBefore", dates.GetProperty("dates")[0].GetProperty("lead").GetString());
    }

    // An empty change, an unknown lead and a date that is not the caller's are refused, and nothing
    // changes (L2-159; L2-122).
    [Fact]
    public async Task An_empty_change_a_wrong_lead_and_another_persons_date_are_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var grace = await BirthdayAsync(mara, "Grace Adeyemi", Today(api).AddDays(3), year: null);

        await (await mara.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { })).AssertProblem(HttpStatusCode.BadRequest, "nothing_to_change");
        await (await mara.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { lead = "Soon" })).AssertProblem(HttpStatusCode.BadRequest, "lead_not_allowed");
        await (await lena.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { on = false })).AssertProblem(HttpStatusCode.NotFound, "key_date_not_found");

        Assert.True((await mara.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("birthdays")[0].GetProperty("remindersOn").GetBoolean());
    }

    // Given Grace's reminder off, when her reminder day comes at 8, then nothing is added in
    // Contacts and nothing is sent (L2-159 AC4).
    [Fact]
    public async Task A_birthday_switched_off_reminds_of_nothing()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");
        var morning = new DateTimeOffset(api.Clock.GetUtcNow().UtcDateTime.Date.AddDays(1).AddHours(8), TimeSpan.Zero);
        var grace = await BirthdayAsync(mara, "Grace Adeyemi", DateOnly.FromDateTime(morning.UtcDateTime).AddDays(7), year: null);
        (await mara.PutAsJsonAsync($"/api/contacts/key-dates/{grace}/reminder", new { on = false })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(morning);

        var added = await api.SendAsync(new SendContactRemindersCommand());
        await api.DispatchAsync();

        Assert.Equal(0, added);
        Assert.Empty(api.NotificationEmails.Sent);
        Assert.Empty(await mara.GetFromJsonAsync<JsonElement[]>("/api/contacts/reminders") ?? []);
    }
}
