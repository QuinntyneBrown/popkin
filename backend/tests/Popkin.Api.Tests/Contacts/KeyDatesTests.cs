// Acceptance Test
// Traces to: L2-137, L2-138, L2-139, L2-126, L2-128, L2-132, L2-122
// Description: Key dates are added for a contact, listed on Dates soonest first, and keep their own reminder.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Contacts;

public sealed class KeyDatesTests
{
    private static object Birthday(int month, int day, int? year = null, string? lead = null, Guid? clientId = null) => new
    {
        clientId = clientId ?? Guid.NewGuid(),
        kind = "Birthday",
        month,
        day,
        year,
        everyYear = true,
        lead,
    };

    private static async Task<Guid> ContactAsync(HttpClient owner, string name) =>
        (await owner.AddedContactAsync(name)).GetProperty("id").GetGuid();

    // Given Mara keeps Grace and Ruth, when she adds Grace's birthday (1993) and Ruth's (1948),
    // then Dates lists Grace's first, "in 4 days", turning 33, with 1 week before, and Ruth's
    // after; Grace's profile and People show it too (L2-137 AC1, AC3; L2-138 AC4).
    [Fact]
    public async Task A_birthday_added_shows_on_Dates_on_the_profile_and_in_People()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");

        var added = await mara.PostAsJsonAsync($"/api/contacts/people/{ruth}/key-dates", Birthday(10, 24, 1948));
        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        (await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", Birthday(9, 19, 1993))).EnsureSuccessStatusCode();

        var dates = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/dates?on=2026-09-15&kind=all");
        var rows = dates.GetProperty("dates").EnumerateArray().ToList();
        Assert.Equal(["Grace", "Ruth"], rows.Select(r => r.GetProperty("firstName").GetString()));
        var first = rows[0];
        Assert.Equal("Birthday", first.GetProperty("kind").GetString());
        Assert.Equal("2026-09-19", first.GetProperty("occursOn").GetString());
        Assert.Equal(4, first.GetProperty("daysLeft").GetInt32());
        Assert.Equal(33, first.GetProperty("years").GetInt32());
        Assert.Equal("OneWeekBefore", first.GetProperty("lead").GetString());
        Assert.Equal(grace, first.GetProperty("contactId").GetGuid());
        Assert.Equal("OneWeekBefore", dates.GetProperty("preferences").GetProperty("birthdayLead").GetString());

        var profile = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{grace}?on=2026-09-15");
        var keyDate = Assert.Single(profile.GetProperty("keyDates").EnumerateArray());
        Assert.Equal("2026-09-19", keyDate.GetProperty("nextOn").GetString());
        Assert.Equal(4, keyDate.GetProperty("daysLeft").GetInt32());

        var people = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        var row = people.GetProperty("contacts").EnumerateArray().Single(c => c.GetProperty("firstName").GetString() == "Grace");
        Assert.Equal(9, row.GetProperty("nextDate").GetProperty("month").GetInt32());
        Assert.Equal(19, row.GetProperty("nextDate").GetProperty("day").GetInt32());
        Assert.Equal(4, row.GetProperty("nextDate").GetProperty("inDays").GetInt32());
    }

    // Given the filter "birthdays", when Dates is read, then only birthdays show (L2-137 AC2).
    [Fact]
    public async Task Dates_are_filtered_by_kind()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await ContactAsync(mara, "Chidi Okafor");
        (await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/key-dates", Birthday(1, 24))).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/key-dates", new
        {
            clientId = Guid.NewGuid(), kind = "Anniversary", month = 9, day = 26, year = 2021, everyYear = true,
        })).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/key-dates", new
        {
            clientId = Guid.NewGuid(), kind = "Other", title = "First day at the new job", month = 10, day = 5, year = 2026, everyYear = false,
        })).EnsureSuccessStatusCode();

        async Task<string[]> Kinds(string kind) =>
            (await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/dates?on=2026-09-15&kind={kind}"))
                .GetProperty("dates").EnumerateArray().Select(r => r.GetProperty("kind").GetString()!).ToArray();

        Assert.Equal(["Anniversary", "Other", "Birthday"], await Kinds("all"));
        Assert.Equal(["Birthday"], await Kinds("birthdays"));
        Assert.Equal(["Anniversary"], await Kinds("anniversaries"));
        Assert.Equal(["Other"], await Kinds("milestones"));
    }

    // Given no day, a day that is not real, or a lead not offered, when a date is added, then it is refused (L2-138 AC2).
    [Theory]
    [InlineData(null, 19, "day_required")]
    [InlineData(4, 31, "day_not_valid")]
    public async Task A_date_without_a_real_day_is_refused(int? month, int day, string code)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", new
        {
            clientId = Guid.NewGuid(), kind = "Birthday", month, day, everyYear = true,
        });

        await response.AssertProblem(HttpStatusCode.BadRequest, code);
    }

    // Given Lena's contact, when Mara adds a date to it, then it is 404 (L2-122).
    [Fact]
    public async Task A_date_cannot_be_added_to_someone_elses_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var bea = await ContactAsync(lena, "Bea Lind");

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{bea}/key-dates", Birthday(5, 1));

        await response.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
    }

    // Given the same client id sent twice, when the date is added, then it is kept once (L2-123 AC4).
    [Fact]
    public async Task A_resend_saves_once()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");
        var clientId = Guid.NewGuid();

        (await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", Birthday(9, 19, clientId: clientId))).EnsureSuccessStatusCode();
        var again = await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", Birthday(9, 19, clientId: clientId));

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var dates = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/dates?on=2026-09-15&kind=all");
        Assert.Single(dates.GetProperty("dates").EnumerateArray());
    }

    // Given a changed default, when a new birthday is added without a lead, then it starts at the
    // new default and the one kept keeps its own; changing one date's reminder changes it alone
    // (L2-139 AC2, AC3).
    [Fact]
    public async Task Defaults_start_new_dates_and_a_dates_reminder_changes_it_alone()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        var graces = await (await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", Birthday(9, 19)))
            .Content.ReadFromJsonAsync<JsonElement>();

        (await mara.PutAsJsonAsync("/api/contacts/reminder-preferences", new
        {
            birthdayLead = "TwoWeeksBefore", anniversaryLead = "ThreeDaysBefore", milestoneLead = "OnTheDay",
            phoneNotifications = true, mondayEmail = false,
        })).EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync($"/api/contacts/people/{ruth}/key-dates", Birthday(10, 24))).EnsureSuccessStatusCode();
        var changed = await mara.PutAsJsonAsync($"/api/contacts/key-dates/{graces.GetProperty("id").GetGuid()}/reminder", new { lead = "OnTheDay" });
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);

        var dates = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/dates?on=2026-09-15&kind=all");
        Assert.Equal(["OnTheDay", "TwoWeeksBefore"], dates.GetProperty("dates").EnumerateArray().Select(r => r.GetProperty("lead").GetString()));
        var preferences = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/reminder-preferences");
        Assert.Equal("TwoWeeksBefore", preferences.GetProperty("birthdayLead").GetString());
        Assert.False(preferences.GetProperty("mondayEmail").GetBoolean());
    }

    // Given a key date, when it is removed, or its contact is deleted, then it is gone (L2-132).
    [Fact]
    public async Task A_date_is_removed_and_goes_with_its_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        var graces = await (await mara.PostAsJsonAsync($"/api/contacts/people/{grace}/key-dates", Birthday(9, 19)))
            .Content.ReadFromJsonAsync<JsonElement>();
        (await mara.PostAsJsonAsync($"/api/contacts/people/{ruth}/key-dates", Birthday(10, 24))).EnsureSuccessStatusCode();

        var removed = await mara.DeleteAsync($"/api/contacts/key-dates/{graces.GetProperty("id").GetGuid()}");
        (await mara.DeleteAsync($"/api/contacts/people/{ruth}")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        using var scope = api.Services.CreateScope();
        Assert.Empty(scope.ServiceProvider.GetRequiredService<AppDbContext>().KeyDates);
        await (await mara.DeleteAsync($"/api/contacts/key-dates/{graces.GetProperty("id").GetGuid()}"))
            .AssertProblem(HttpStatusCode.NotFound, "key_date_not_found");
    }

    [Fact]
    public async Task Dates_need_a_day()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        await (await mara.GetAsync("/api/contacts/dates?kind=all")).AssertProblem(HttpStatusCode.BadRequest, "invalid_date");
    }
}
