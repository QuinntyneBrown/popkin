// Acceptance Test
// Traces to: L2-128, L2-131, L2-122
// Description: A contact's profile shows what is kept about them, and its menu puts them in Closest or takes them out.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>GET /api/contacts/people/{contactId} and PUT or DELETE …/closest (L2-128, L2-131).</summary>
public sealed class ContactProfileTests
{
    [Fact]
    public async Task Given_Mara_adds_Femi_with_how_they_met_when_she_opens_the_profile_then_it_shows_how_they_met_and_not_Closest()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var femi = (await (await mara.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name = "Femi Bankole",
            circle = "Friends",
            howWeMet = " Through Grace, at the wedding ",
            loves = Array.Empty<string>(),
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var profile = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{femi}");

        Assert.Equal("Through Grace, at the wedding", profile.GetProperty("howWeMet").GetString());
        Assert.False(profile.GetProperty("isClosest").GetBoolean());
    }

    [Fact]
    public async Task Given_Chidi_in_Family_when_Mara_adds_him_to_Closest_and_takes_him_out_then_he_stays_in_Family()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await (await mara.AddContactAsync(new { clientId = Guid.NewGuid(), name = "Chidi Okafor", circle = "Family", loves = Array.Empty<string>() }))
            .Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var added = await mara.PutAsync($"/api/contacts/people/{chidi}/closest", null);
        var again = await mara.PutAsync($"/api/contacts/people/{chidi}/closest", null);
        var inClosest = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{chidi}");
        var taken = await mara.DeleteAsync($"/api/contacts/people/{chidi}/closest");
        var takenAgain = await mara.DeleteAsync($"/api/contacts/people/{chidi}/closest");
        var outOfClosest = await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{chidi}");

        Assert.Equal(HttpStatusCode.NoContent, added.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.True(inClosest.GetProperty("isClosest").GetBoolean());
        Assert.Equal(HttpStatusCode.NoContent, taken.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, takenAgain.StatusCode);
        Assert.False(outOfClosest.GetProperty("isClosest").GetBoolean());
        Assert.Equal("Family", outOfClosest.GetProperty("circle").GetString());
    }

    [Fact]
    public async Task Given_Mara_keeps_Chidi_when_Lena_puts_him_in_her_Closest_then_he_is_not_found_and_nothing_changes()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await lena.PutAsync($"/api/contacts/people/{chidi}/closest", null);

        await response.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        Assert.False((await mara.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{chidi}")).GetProperty("isClosest").GetBoolean());
    }
}
