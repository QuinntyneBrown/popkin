// Acceptance Test
// Traces to: L2-126, L2-122, L2-123
// Description: People lists the caller's own contacts, A to Z, for the device's day.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>GET /api/contacts/people?on= (L2-126).</summary>
public sealed class PeopleTests
{
    [Fact]
    public async Task Given_Mara_keeps_three_people_when_she_opens_People_then_they_come_back_A_to_Z_and_not_Lenas()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        await mara.AddedContactAsync("grace Adeyemi");
        var chidi = (await mara.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name = "Chidi Okafor",
            knownAs = "Brother",
            circle = "Family",
            loves = Array.Empty<string>(),
        })).Content.ReadFromJsonAsync<JsonElement>();
        await mara.AddedContactAsync("Ada Okafor");
        await lena.AddedContactAsync("Bea Lind");
        await mara.PutAsync($"/api/contacts/people/{(await chidi).GetProperty("id").GetGuid()}/closest", null);

        var people = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");

        var rows = people.GetProperty("contacts").EnumerateArray().ToList();
        Assert.Equal(["Ada Okafor", "Chidi Okafor", "grace Adeyemi"], rows.Select(r => r.GetProperty("name").GetString()));
        var row = rows[1];
        Assert.Equal("Chidi", row.GetProperty("firstName").GetString());
        Assert.Equal("Brother", row.GetProperty("knownAs").GetString());
        Assert.Equal("Family", row.GetProperty("circle").GetString());
        Assert.True(row.GetProperty("isClosest").GetBoolean());
        Assert.Equal("CO", row.GetProperty("initials").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("photoUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, row.GetProperty("nextDate").ValueKind);
        Assert.Equal(JsonValueKind.Null, row.GetProperty("lastTalkedOn").ValueKind);
    }

    [Theory]
    [InlineData("/api/contacts/people")]
    [InlineData("/api/contacts/people?on=15-09-2026")]
    [InlineData("/api/contacts/people?on=2026-02-30")]
    public async Task Given_no_day_or_one_that_is_not_a_day_when_People_is_read_then_it_is_refused(string path)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.GetAsync(path);

        await response.AssertProblem(HttpStatusCode.BadRequest, "invalid_date");
    }
}
