// Acceptance Test
// Traces to: L2-151, L2-128, L2-122, known gaps 110 and 117 (ruled)
// Description: The people a person shares Popkins with are offered once each, imported with their name only, never twice, never from a Popkin not shared, and a contact made by Import names a Popkin both are in.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Account;

namespace Popkin.Api.Tests.Contacts;

public sealed class ImportContactsTests
{
    private sealed record Cast(ApiFactory Api, HttpClient Mara, StartedPopkin Lakeside, StartedSpace Thursday);

    // Mara hosts Lakeside Weekend, with Walt and Dev, and Thursday Night Group, with Walt and Joel.
    private static async Task<Cast> CastAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        // Thursday Night Group is the newer, so its activity is the latest.
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var thursday = await lakeside.Host.StartedAsync("Thursday Night Group", "🎉");
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0101");
        (await walt.JoinAsync(thursday.Code, "Walt Brennan")).EnsureSuccessStatusCode();
        await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0102");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await api.JoinedAsync(thursday.Code, "Joel Kim", "(415) 555-0103");
        return new Cast(api, lakeside.Host, lakeside, thursday);
    }

    private static Task<JsonElement> CandidatesAsync(HttpClient owner) =>
        owner.GetFromJsonAsync<JsonElement>("/api/contacts/import");

    private static string[] Names(JsonElement popkin) =>
        popkin.GetProperty("people").EnumerateArray().Select(p => p.GetProperty("name").GetString()!).ToArray();

    private static Guid PersonId(JsonElement candidates, string name) =>
        candidates.GetProperty("popkins").EnumerateArray()
            .SelectMany(p => p.GetProperty("people").EnumerateArray())
            .First(p => p.GetProperty("name").GetString() == name)
            .GetProperty("personId").GetGuid();

    private static Task<HttpResponseMessage> ImportAsync(HttpClient owner, Guid clientId, params Guid[] personIds) =>
        owner.PostAsJsonAsync("/api/contacts/import", new { clientId, personIds });

    private static async Task<string> CodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString()!;

    // Given Walt in both of Mara's Popkins, when Import opens, then each Popkin lists its people A to
    // Z, Walt under both, and he counts once; Mara is not offered (L2-151 AC1, AC2, AC6).
    [Fact]
    public async Task The_people_of_her_Popkins_are_offered_once_each()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);

        var candidates = await CandidatesAsync(cast.Mara);

        Assert.Equal(3, candidates.GetProperty("total").GetInt32());
        var popkins = candidates.GetProperty("popkins").EnumerateArray().ToArray();
        var names = popkins.ToDictionary(p => p.GetProperty("name").GetString()!, Names);
        Assert.Equal(["Dev Patel", "Walt Brennan"], names["Lakeside Weekend"]);
        Assert.Equal(["Joel Kim", "Walt Brennan"], names["Thursday Night Group"]);
        Assert.All(popkins, p => Assert.Equal(2, p.GetProperty("peopleCount").GetInt32()));
    }

    // Someone who left the Popkin and someone whose account is deleted are not offered (L2-151 AC1).
    [Fact]
    public async Task Nobody_who_left_or_deleted_their_account_is_offered()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        await api.JoinedAsync(cast.Lakeside.Code, "Ellie Brennan", "(415) 555-0104");
        await api.LeaveAsync(cast.Lakeside.Id, "Ellie Brennan");
        var ben = await api.JoinedAsync(cast.Lakeside.Code, "Ben Hale", "(415) 555-0105");
        (await ben.DeleteAsync("/api/account")).EnsureSuccessStatusCode();

        var candidates = await CandidatesAsync(cast.Mara);

        var lakeside = candidates.GetProperty("popkins").EnumerateArray()
            .Single(p => p.GetProperty("name").GetString() == "Lakeside Weekend");
        Assert.Equal(["Dev Patel", "Walt Brennan"], Names(lakeside));
        Assert.Equal(3, candidates.GetProperty("total").GetInt32());
    }

    // Given Walt ticked twice and Dev, when Mara imports, then two contacts are made with their names
    // and nothing else, they are offered no more, and a resend imports nobody more (L2-151 AC2, AC4).
    [Fact]
    public async Task Importing_makes_one_contact_each_and_never_twice()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        var candidates = await CandidatesAsync(cast.Mara);
        var walt = PersonId(candidates, "Walt Brennan");
        var dev = PersonId(candidates, "Dev Patel");
        var clientId = Guid.NewGuid();

        var imported = await ImportAsync(cast.Mara, clientId, walt, walt, dev);
        var again = await ImportAsync(cast.Mara, clientId, walt, walt, dev);

        Assert.Equal(HttpStatusCode.OK, imported.StatusCode);
        Assert.Equal(2, (await imported.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("imported").GetInt32());
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(2, await cast.Mara.ContactsCountAsync());
        var people = await cast.Mara.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        var waltContact = people.GetProperty("contacts").EnumerateArray()
            .Single(c => c.GetProperty("name").GetString() == "Walt Brennan");
        Assert.Equal(JsonValueKind.Null, waltContact.GetProperty("knownAs").ValueKind);
        Assert.Equal(JsonValueKind.Null, waltContact.GetProperty("photoUrl").ValueKind);
        var left = await CandidatesAsync(cast.Mara);
        Assert.Equal(1, left.GetProperty("total").GetInt32());
        var later = await ImportAsync(cast.Mara, Guid.NewGuid(), walt, PersonId(left, "Joel Kim"));
        Assert.Equal(1, (await later.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("imported").GetInt32());
    }

    // An empty list and someone Mara shares no Popkin with are refused, and nobody is imported
    // (L2-151 AC3; L2-122 AC1).
    [Fact]
    public async Task Nobody_and_a_stranger_are_refused()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        var stranger = await api.StartPopkinAsync("Priya Nair", "(415) 555-0106", "Tigers U9 Parents");
        var dev = PersonId(await CandidatesAsync(cast.Mara), "Dev Patel");

        var nobody = await ImportAsync(cast.Mara, Guid.NewGuid());
        var notShared = await ImportAsync(cast.Mara, Guid.NewGuid(), dev, stranger.HostPersonId);

        Assert.Equal(HttpStatusCode.BadRequest, nobody.StatusCode);
        Assert.Equal("import_nobody", await CodeAsync(nobody));
        Assert.Equal(HttpStatusCode.BadRequest, notShared.StatusCode);
        Assert.Equal("import_person_not_shared", await CodeAsync(notShared));
        Assert.Equal(0, await cast.Mara.ContactsCountAsync());
    }

    // Given Walt imported, when his profile opens, then it names the newest Popkin they are both in
    // and how many more there are (L2-128 AC2).
    [Fact]
    public async Task An_imported_contact_names_a_Popkin_they_share()
    {
        using var api = new ApiFactory();
        var cast = await CastAsync(api);
        var walt = PersonId(await CandidatesAsync(cast.Mara), "Walt Brennan");
        (await ImportAsync(cast.Mara, Guid.NewGuid(), walt)).EnsureSuccessStatusCode();
        var people = await cast.Mara.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        var contactId = people.GetProperty("contacts")[0].GetProperty("id").GetGuid();

        var profile = await cast.Mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{contactId}");

        var alsoIn = profile.GetProperty("alsoIn");
        Assert.Equal(cast.Thursday.Id, alsoIn.GetProperty("popkinId").GetGuid());
        Assert.Equal("Thursday Night Group", alsoIn.GetProperty("name").GetString());
        Assert.Equal(1, alsoIn.GetProperty("more").GetInt32());
    }

    // Given Walt imported, when his account is erased, then Mara keeps the contact, unlinked, and
    // the profile no longer names a Popkin (known gap 117, ruled).
    [Fact]
    public async Task An_erased_account_leaves_the_contact_unlinked()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0101");
        var waltId = PersonId(await CandidatesAsync(lakeside.Host), "Walt Brennan");
        (await ImportAsync(lakeside.Host, Guid.NewGuid(), waltId)).EnsureSuccessStatusCode();
        var people = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        var contactId = people.GetProperty("contacts")[0].GetProperty("id").GetGuid();
        (await walt.DeleteAsync("/api/account")).EnsureSuccessStatusCode();
        api.Clock.Advance(TimeSpan.FromDays(1));

        await api.SendAsync(new PurgeDeletedAccountsCommand());

        var profile = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{contactId}");
        Assert.Equal("Walt Brennan", profile.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("alsoIn").ValueKind);
    }
}
