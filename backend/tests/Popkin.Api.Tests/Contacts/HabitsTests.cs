// Acceptance Test
// Traces to: L2-143, L2-144, L2-145, L2-128, L2-132, L2-122
// Description: A habit is started with one contact, kept with "We met up", undone, ended and brought back.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure.Persistence;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class HabitsTests
{
    private static async Task<JsonElement[]> HabitsAsync(HttpClient owner) =>
        (await owner.GetFromJsonAsync<JsonElement[]>("/api/contacts/habits"))!;

    private static Task<HttpResponseMessage> StartAsync(HttpClient owner, Guid contactId, string? what = "Lunch", string rhythm = "EveryTwoWeeks", Guid? clientId = null) =>
        owner.PostAsJsonAsync("/api/contacts/habits", new { clientId = clientId ?? Guid.NewGuid(), contactId, what, rhythm });

    private static async Task<Guid> StartedAsync(HttpClient owner, Guid contactId, string rhythm = "EveryTwoWeeks")
    {
        var response = await StartAsync(owner, contactId, "Lunch", rhythm);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static string Day(DateOnly day) => day.ToString("yyyy-MM-dd");

    private static DateOnly Today(ApiFactory api) => DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);

    private static async Task<string> CodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString()!;

    // Given Mara keeps Chidi, when she starts "Lunch" every 2 weeks with him, then Habits lists it
    // with Chidi's first name, its rhythm, today as its last time and two weeks on as its due day,
    // and his profile shows it (L2-145 AC3, L2-143 AC1, L2-128 AC5).
    [Fact]
    public async Task A_habit_started_is_listed_and_on_the_profile()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var today = Today(api);

        var started = await StartAsync(mara, chidi, "  Lunch ");

        Assert.Equal(HttpStatusCode.Created, started.StatusCode);
        var habit = Assert.Single(await HabitsAsync(mara));
        Assert.Equal("Lunch", habit.GetProperty("what").GetString());
        Assert.Equal("Chidi", habit.GetProperty("contactFirstName").GetString());
        Assert.Equal("EveryTwoWeeks", habit.GetProperty("rhythm").GetString());
        Assert.Equal(Day(today), habit.GetProperty("lastTime").GetString());
        Assert.Equal(Day(today.AddDays(14)), habit.GetProperty("dueOn").GetString());
        Assert.Empty(habit.GetProperty("kept").EnumerateArray());
        var profile = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Lunch", profile.GetProperty("habit").GetProperty("what").GetString());
    }

    // Given a habit, when "We met up" is sent for today, then it is kept and due a rhythm on; when
    // the same keep is sent again, it is kept once; when it is undone, the habit is as it was
    // (L2-144 AC1, AC2, L2-123 AC4).
    [Fact]
    public async Task We_met_up_moves_the_due_day_on_once_and_undo_puts_it_back()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var id = await StartedAsync(mara, chidi, "Weekly");
        api.Clock.Advance(TimeSpan.FromDays(9));
        var today = Today(api);
        var keep = new { clientId = Guid.NewGuid(), keptOn = Day(today) };

        var kept = await mara.PostAsJsonAsync($"/api/contacts/habits/{id}/kept", keep);
        var again = await mara.PostAsJsonAsync($"/api/contacts/habits/{id}/kept", keep);

        Assert.Equal(HttpStatusCode.Created, kept.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var body = await kept.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(Day(today.AddDays(7)), body.GetProperty("habit").GetProperty("dueOn").GetString());
        var habit = Assert.Single(await HabitsAsync(mara));
        Assert.Equal(Day(today), Assert.Single(habit.GetProperty("kept").EnumerateArray()).GetProperty("on").GetString());

        var undone = await mara.DeleteAsync($"/api/contacts/habits/{id}/kept/{body.GetProperty("keptId").GetGuid()}");

        undone.EnsureSuccessStatusCode();
        habit = Assert.Single(await HabitsAsync(mara));
        Assert.Empty(habit.GetProperty("kept").EnumerateArray());
        Assert.Equal(Day(today.AddDays(-9).AddDays(7)), habit.GetProperty("dueOn").GetString());
    }

    // Given a habit, when "End this habit" is chosen, then it leaves Habits and the profile; when
    // its Undo is chosen, it is back as it was (L2-144 AC3).
    [Fact]
    public async Task Ending_a_habit_and_its_undo()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var id = await StartedAsync(mara, chidi);

        var ended = await mara.PostAsync($"/api/contacts/habits/{id}/end", null);

        Assert.Equal(HttpStatusCode.NoContent, ended.StatusCode);
        Assert.Empty(await HabitsAsync(mara));
        var profile = await (await mara.GetContactAsync(chidi)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("habit").ValueKind);

        var resumed = await mara.DeleteAsync($"/api/contacts/habits/{id}/end");

        resumed.EnsureSuccessStatusCode();
        Assert.Equal(id, Assert.Single(await HabitsAsync(mara)).GetProperty("id").GetGuid());
    }

    // Given Chidi has a habit, when another is started with him, then nothing is saved: 409
    // habit_exists; once it has ended, one can be started (L2-145 AC6).
    [Fact]
    public async Task One_habit_per_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var first = await StartedAsync(mara, chidi);

        var second = await StartAsync(mara, chidi, "Sunday call", "Weekly");

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("habit_exists", await CodeAsync(second));
        (await mara.PostAsync($"/api/contacts/habits/{first}/end", null)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Created, (await StartAsync(mara, chidi, "Sunday call", "Weekly")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await mara.DeleteAsync($"/api/contacts/habits/{first}/end")).StatusCode);
    }

    // Given nothing in "What", or a rhythm that is not one of the three, when the habit is started,
    // then nothing is saved and the refusal names the field (L2-145 AC2).
    [Theory]
    [InlineData("   ", "Weekly", "what_required")]
    [InlineData(null, "Weekly", "what_required")]
    [InlineData("Lunch", "Daily", "rhythm_not_allowed")]
    public async Task A_habit_that_cannot_be_started(string? what, string rhythm, string code)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await StartAsync(mara, chidi, what, rhythm);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(code, await CodeAsync(response));
        Assert.Empty(await HabitsAsync(mara));
    }

    // Given a day kept two days from the API's own, when "We met up" is sent, then 400
    // kept_on_out_of_range (known gap 104, ruled).
    [Fact]
    public async Task A_day_kept_far_from_today_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var id = await StartedAsync(mara, chidi);

        var response = await mara.PostAsJsonAsync($"/api/contacts/habits/{id}/kept", new { clientId = Guid.NewGuid(), keptOn = Day(Today(api).AddDays(2)) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("kept_on_out_of_range", await CodeAsync(response));
    }

    // Given Femi's habit, when Mara keeps, undoes, ends or lists it, then she cannot: 404
    // habit_not_found, and her Habits are empty (L2-122).
    [Fact]
    public async Task Another_persons_habit_is_not_found()
    {
        using var api = new ApiFactory();
        var femi = await api.SignedUpAsync("Femi Adeyemi", "(415) 555-0199");
        var ruth = (await femi.AddedContactAsync("Ruth Lindqvist")).GetProperty("id").GetGuid();
        var id = await StartedAsync(femi, ruth);
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var kept = await mara.PostAsJsonAsync($"/api/contacts/habits/{id}/kept", new { clientId = Guid.NewGuid(), keptOn = Day(Today(api)) });
        var ended = await mara.PostAsync($"/api/contacts/habits/{id}/end", null);

        Assert.Equal(HttpStatusCode.NotFound, kept.StatusCode);
        Assert.Equal("habit_not_found", await CodeAsync(kept));
        Assert.Equal(HttpStatusCode.NotFound, ended.StatusCode);
        Assert.Empty(await HabitsAsync(mara));
        Assert.Equal(HttpStatusCode.NotFound, (await StartAsync(mara, ruth)).StatusCode);
    }

    // Given Chidi has a habit kept once, when he is deleted, then the habit goes with him (L2-132).
    [Fact]
    public async Task Deleting_a_contact_removes_their_habit()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var id = await StartedAsync(mara, chidi);
        (await mara.PostAsJsonAsync($"/api/contacts/habits/{id}/kept", new { clientId = Guid.NewGuid(), keptOn = Day(Today(api)) })).EnsureSuccessStatusCode();

        (await mara.DeleteAsync($"/api/contacts/people/{chidi}")).EnsureSuccessStatusCode();

        Assert.Empty(await HabitsAsync(mara));
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(db.Habits);
        Assert.Empty(db.HabitKept);
    }
}
