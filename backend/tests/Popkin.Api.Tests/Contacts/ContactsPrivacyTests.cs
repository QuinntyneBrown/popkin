// Acceptance Test
// Traces to: L2-122 AC3, docs/detailed-designs/contacts/contacts-privacy
// Description: Adding someone with an account to Contacts, or deleting them, tells them nothing: no hub event, no text, no email, no reminder.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class ContactsPrivacyTests
{
    // Given Mara and Walt in Lakeside Weekend, Walt with Popkin open,
    // when Mara imports Walt into her Contacts, keeps a date for him and then deletes him,
    // then Walt's connection hears nothing of it before Mara's next message in Lakeside reaches him,
    // and nobody is sent a code, an invite, a phone reminder or an email.
    [Fact]
    public async Task Walt_is_told_nothing_when_Mara_imports_and_deletes_him()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt Brennan", "(415) 555-0101");
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        var codesBefore = api.Codes.Sent.Count;
        var invitesBefore = api.CrewInvites.Sent.Count;

        var candidates = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/contacts/import");
        var waltPerson = candidates.GetProperty("popkins").EnumerateArray()
            .SelectMany(p => p.GetProperty("people").EnumerateArray())
            .First(p => p.GetProperty("name").GetString() == "Walt Brennan")
            .GetProperty("personId").GetGuid();
        (await lakeside.Host.PostAsJsonAsync("/api/contacts/import", new { clientId = Guid.NewGuid(), personIds = new[] { waltPerson } }))
            .EnsureSuccessStatusCode();
        var people = await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/contacts/people?on=2026-09-15");
        var waltContact = people.GetProperty("contacts").EnumerateArray()
            .Single(c => c.GetProperty("name").GetString() == "Walt Brennan")
            .GetProperty("id").GetGuid();
        var today = DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);
        (await lakeside.Host.PostAsJsonAsync($"/api/contacts/people/{waltContact}/key-dates", new
        {
            clientId = Guid.NewGuid(), kind = "Birthday", month = today.Month, day = today.Day, year = (int?)null, everyYear = true, lead = "OnTheDay",
        })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.DeleteAsync($"/api/contacts/people/{waltContact}")).StatusCode);
        var marker = await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "See you at the lake");

        await waltHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == marker.GetProperty("id").GetGuid());
        var heard = waltHub.Received.TakeWhile(e => e.Name != "MessageAdded").ToList();
        Assert.All(heard, e => Assert.DoesNotContain("Walt", e.ToString()));
        Assert.DoesNotContain(waltHub.Received, e => e.Name.Contains("Contact", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(codesBefore, api.Codes.Sent.Count);
        Assert.Equal(invitesBefore, api.CrewInvites.Sent.Count);
        Assert.Empty(api.PhoneAlerts.Sent);
        Assert.Empty(api.NotificationEmails.Sent);
    }
}
