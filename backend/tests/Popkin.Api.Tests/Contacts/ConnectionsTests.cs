// Acceptance Test
// Traces to: L2-149, L2-150, L2-130, L2-132, L2-122, known gap 109 (ruled)
// Description: Two contacts are connected once, show on the map and on both profiles, are connected and removed from the contact form, and go with either contact.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure.Persistence;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class ConnectionsTests
{
    private static async Task<JsonElement> MapAsync(HttpClient owner) =>
        await owner.GetFromJsonAsync<JsonElement>("/api/contacts/connections");

    private static Task<HttpResponseMessage> ConnectAsync(
        HttpClient owner, Guid contactId, Guid? otherContactId, string kind = "Partner", string? words = "Married", bool promised = false, Guid? clientId = null) =>
        owner.PostAsJsonAsync("/api/contacts/connections", new { clientId = clientId ?? Guid.NewGuid(), contactId, otherContactId, kind, words, promised });

    private static async Task<Guid> IdAsync(HttpClient owner, string name) =>
        (await owner.AddedContactAsync(name)).GetProperty("id").GetGuid();

    private static async Task<JsonElement> ProfileAsync(HttpClient owner, Guid id) =>
        await (await owner.GetContactAsync(id)).Content.ReadFromJsonAsync<JsonElement>();

    private static async Task<string> CodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString()!;

    // Given Chidi and Tomás, when Mara connects them as partners, "Married", then the map shows
    // both faces and the line, and both profiles list the other under "People around" with her
    // words; a resend saves once (L2-150 AC4, L2-149 AC1, L2-123 AC4).
    [Fact]
    public async Task A_connection_made_is_on_the_map_and_on_both_profiles()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdAsync(mara, "Chidi Okafor");
        var tomas = await IdAsync(mara, "Tomás Reyes");
        var clientId = Guid.NewGuid();

        var made = await ConnectAsync(mara, chidi, tomas, clientId: clientId);
        var again = await ConnectAsync(mara, chidi, tomas, clientId: clientId);

        Assert.Equal(HttpStatusCode.Created, made.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var map = await MapAsync(mara);
        Assert.Equal(
            ["Chidi Okafor", "Tomás Reyes"],
            map.GetProperty("people").EnumerateArray().Select(p => p.GetProperty("fullName").GetString()).Order());
        var line = Assert.Single(map.GetProperty("connections").EnumerateArray());
        Assert.Equal("Partner", line.GetProperty("kind").GetString());
        Assert.Equal("Married", line.GetProperty("words").GetString());
        Assert.False(line.GetProperty("promised").GetBoolean());
        var around = Assert.Single((await ProfileAsync(mara, tomas)).GetProperty("around").EnumerateArray());
        Assert.Equal("Chidi Okafor", around.GetProperty("name").GetString());
        Assert.Equal("Married", around.GetProperty("words").GetString());
        var aroundChidi = Assert.Single((await ProfileAsync(mara, chidi)).GetProperty("around").EnumerateArray());
        Assert.Equal("Tomás Reyes", aroundChidi.GetProperty("name").GetString());
    }

    // Given Chidi and Tomás connected, when they are connected again either way round, then it is
    // refused as already connected (L2-150 AC5).
    [Fact]
    public async Task A_pair_is_connected_once_in_either_order()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdAsync(mara, "Chidi Okafor");
        var tomas = await IdAsync(mara, "Tomás Reyes");
        (await ConnectAsync(mara, chidi, tomas)).EnsureSuccessStatusCode();

        var refused = await ConnectAsync(mara, tomas, chidi, "Friend", null);

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("already_connected", await CodeAsync(refused));
    }

    // Nobody chosen, a contact to itself, a kind not offered, words over 60 and another
    // person's contact are each refused and nothing is saved (L2-150 AC2, AC10, L2-122).
    [Fact]
    public async Task What_is_refused()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var ben = await api.SignedUpAsync("Ben Hale", "(415) 555-0199");
        var chidi = await IdAsync(mara, "Chidi Okafor");
        var tomas = await IdAsync(mara, "Tomás Reyes");
        var bens = await IdAsync(ben, "Sam Ortega");

        Assert.Equal("who_required", await CodeAsync(await ConnectAsync(mara, chidi, null)));
        Assert.Equal("connection_to_self", await CodeAsync(await ConnectAsync(mara, chidi, chidi)));
        Assert.Equal("kind_not_allowed", await CodeAsync(await ConnectAsync(mara, chidi, tomas, "Enemy")));
        Assert.Equal("words_too_long", await CodeAsync(await ConnectAsync(mara, chidi, tomas, words: new string('a', 61))));
        var hidden = await ConnectAsync(mara, chidi, bens);
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        Assert.Equal("contact_not_found", await CodeAsync(hidden));
        Assert.Empty((await MapAsync(mara)).GetProperty("connections").EnumerateArray());
    }

    // Given a promised introduction, when the map is read, then its line is promised (L2-150 AC6);
    // and Ben sees none of Mara's connections, and cannot remove one (L2-122).
    [Fact]
    public async Task A_promised_introduction_and_only_the_owner_sees_or_removes_it()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var ben = await api.SignedUpAsync("Ben Hale", "(415) 555-0199");
        var dev = await IdAsync(mara, "Dev Patel");
        var priya = await IdAsync(mara, "Priya Nair");
        var made = await (await ConnectAsync(mara, dev, priya, "Work", null, promised: true)).Content.ReadFromJsonAsync<JsonElement>();

        var line = Assert.Single((await MapAsync(mara)).GetProperty("connections").EnumerateArray());
        Assert.True(line.GetProperty("promised").GetBoolean());
        Assert.Empty((await MapAsync(ben)).GetProperty("people").EnumerateArray());
        var removed = await ben.DeleteAsync($"/api/contacts/connections/{made.GetProperty("id").GetGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, removed.StatusCode);
        Assert.Equal("connection_not_found", await CodeAsync(removed));
    }

    // Given a connection, when Mara removes it, then the map no longer has it (L2-150 AC9).
    [Fact]
    public async Task A_connection_removed_is_gone()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdAsync(mara, "Chidi Okafor");
        var tomas = await IdAsync(mara, "Tomás Reyes");
        var made = await (await ConnectAsync(mara, chidi, tomas)).Content.ReadFromJsonAsync<JsonElement>();

        var removed = await mara.DeleteAsync($"/api/contacts/connections/{made.GetProperty("id").GetGuid()}");

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        var map = await MapAsync(mara);
        Assert.Empty(map.GetProperty("connections").EnumerateArray());
        Assert.Empty(map.GetProperty("people").EnumerateArray());
    }

    // Given Add someone with "How they connect" holding Chidi as "Partner", when it is saved, then
    // the new contact is connected to Chidi; and Edit with the connection removed takes it off,
    // with the contact, in one save (L2-150 AC9).
    [Fact]
    public async Task How_they_connect_is_saved_with_the_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdAsync(mara, "Chidi Okafor");

        var added = await mara.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name = "Grace Adeyemi",
            loves = Array.Empty<string>(),
            connect = new[] { new { otherContactId = chidi, kind = "Partner", words = (string?)null, promised = false } },
        });

        added.EnsureSuccessStatusCode();
        var grace = await added.Content.ReadFromJsonAsync<JsonElement>();
        var around = Assert.Single(grace.GetProperty("around").EnumerateArray());
        Assert.Equal(chidi, around.GetProperty("contactId").GetGuid());
        Assert.Equal("Partner", around.GetProperty("kind").GetString());

        var edited = await mara.EditContactAsync(grace.GetProperty("id").GetGuid(), new
        {
            clientId = Guid.NewGuid(),
            name = "Grace Adeyemi",
            loves = Array.Empty<string>(),
            disconnect = new[] { around.GetProperty("id").GetGuid() },
        });

        edited.EnsureSuccessStatusCode();
        Assert.Empty((await edited.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("around").EnumerateArray());
        Assert.Empty((await MapAsync(mara)).GetProperty("connections").EnumerateArray());
    }

    // Given Chidi connected to Tomás, when Chidi is deleted, then the connection goes too (L2-132).
    [Fact]
    public async Task Deleting_either_contact_removes_the_connection()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = await IdAsync(mara, "Chidi Okafor");
        var tomas = await IdAsync(mara, "Tomás Reyes");
        (await ConnectAsync(mara, tomas, chidi)).EnsureSuccessStatusCode();

        (await mara.DeleteAsync($"/api/contacts/people/{chidi}")).EnsureSuccessStatusCode();

        using var scope = api.Services.CreateScope();
        Assert.Empty(scope.ServiceProvider.GetRequiredService<AppDbContext>().Connections);
        Assert.Empty((await ProfileAsync(mara, tomas)).GetProperty("around").EnumerateArray());
    }
}
