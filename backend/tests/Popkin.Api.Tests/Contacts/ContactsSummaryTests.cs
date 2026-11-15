// Acceptance Test
// Traces to: L2-121
// Description: Contacts is switched on by its owner (ADR 0023) and its summary counts only the caller's contacts.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

/// <summary>GET /api/contacts/summary: what My Popkins asks before it offers Contacts (L2-121 AC1, AC2).</summary>
public sealed class ContactsSummaryTests
{
    [Fact]
    public async Task Given_a_signed_in_person_with_no_contacts_when_they_ask_for_the_summary_then_it_counts_none()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var body = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/summary");

        Assert.Equal(0, body.GetProperty("people").GetInt32());
    }

    [Fact]
    public async Task Given_Contacts_is_switched_off_when_a_person_asks_for_the_summary_then_it_is_not_found_as_off()
    {
        using var api = new ApiFactory();
        api.Settings["Features:Contacts"] = "false";
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.GetAsync("/api/contacts/summary");

        await response.AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    [Fact]
    public async Task Given_no_session_when_the_summary_is_asked_for_then_it_is_refused()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/contacts/summary");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
