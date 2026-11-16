// Acceptance Test
// Traces to: L2-141, L2-142, L2-132, L2-122
// Description: Follow-ups are added in a line, listed with their contact, ticked done and opened again.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class FollowUpsTests
{
    private static async Task<JsonElement[]> FollowUpsAsync(HttpClient owner) =>
        (await owner.GetFromJsonAsync<JsonElement[]>("/api/contacts/follow-ups"))!;

    // Given Mara keeps Chidi, when she adds "Ask Chidi how the commute is going" for him due on
    // 20 September and "Call Sam about the reference" for nobody, then both are listed open, the
    // first with Chidi's first name and its day, the second with neither (L2-142 AC1, L2-141 AC1).
    [Fact]
    public async Task A_follow_up_added_is_listed_open_with_its_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var forChidi = await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "  Ask Chidi how the commute is going ",
            contactId = chidi,
            dueOn = "2026-09-20",
        });
        var forNobody = await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Call Sam about the reference",
        });

        Assert.Equal(HttpStatusCode.Created, forChidi.StatusCode);
        Assert.Equal(HttpStatusCode.Created, forNobody.StatusCode);
        var list = await FollowUpsAsync(mara);
        Assert.Equal(2, list.Length);
        var chidis = list.Single(f => f.GetProperty("text").GetString() == "Ask Chidi how the commute is going");
        Assert.Equal(chidi, chidis.GetProperty("contactId").GetGuid());
        Assert.Equal("Chidi", chidis.GetProperty("contactFirstName").GetString());
        Assert.Equal("CO", chidis.GetProperty("contactInitials").GetString());
        Assert.Equal("2026-09-20", chidis.GetProperty("dueOn").GetString());
        Assert.False(chidis.GetProperty("isPromise").GetBoolean());
        Assert.Equal(JsonValueKind.Null, chidis.GetProperty("doneAt").ValueKind);
        var nobodys = list.Single(f => f.GetProperty("text").GetString() == "Call Sam about the reference");
        Assert.Equal(JsonValueKind.Null, nobodys.GetProperty("contactId").ValueKind);
        Assert.Equal(JsonValueKind.Null, nobodys.GetProperty("dueOn").ValueKind);
    }

    // Given an open follow-up, when it is marked done, then it is done; when marked not done, it is
    // open again; asking twice changes nothing (L2-142 AC2, AC3).
    [Fact]
    public async Task Marking_done_and_not_done()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var added = await (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Return Ruth’s ladder",
        })).Content.ReadFromJsonAsync<JsonElement>();
        var id = added.GetProperty("id").GetGuid();

        var done = await mara.PutAsJsonAsync($"/api/contacts/follow-ups/{id}/done", new { done = true });
        var again = await mara.PutAsJsonAsync($"/api/contacts/follow-ups/{id}/done", new { done = true });

        done.EnsureSuccessStatusCode();
        var doneAt = (await done.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("doneAt").GetString();
        Assert.NotNull(doneAt);
        Assert.Equal(doneAt, (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("doneAt").GetString());

        var open = await mara.PutAsJsonAsync($"/api/contacts/follow-ups/{id}/done", new { done = false });

        open.EnsureSuccessStatusCode();
        Assert.Equal(JsonValueKind.Null, (await FollowUpsAsync(mara))[0].GetProperty("doneAt").ValueKind);
    }

    // Given a follow-up sent twice under one client id (the outbox resends), then it is kept once.
    [Fact]
    public async Task A_resend_saves_once()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var follow = new { clientId = Guid.NewGuid(), text = "Call Sam about the reference" };

        var first = await mara.PostAsJsonAsync("/api/contacts/follow-ups", follow);
        var second = await mara.PostAsJsonAsync("/api/contacts/follow-ups", follow);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Single(await FollowUpsAsync(mara));
    }

    // Given text that is blank or too long, or a day that is not one, then nothing is kept.
    [Theory]
    [InlineData("   ", null, "text_required")]
    [InlineData(null, null, "text_required")]
    [InlineData("long", null, "text_too_long")]
    [InlineData("Call Sam", "2026-02-30", "due_not_valid")]
    public async Task A_follow_up_that_is_not_right_is_refused(string? text, string? dueOn, string code)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var response = await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = text == "long" ? new string('a', 201) : text,
            dueOn,
        });

        await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Empty(await FollowUpsAsync(mara));
    }

    // Given Ade's follow-up and contact, then Mara sees neither, ticks neither and adds nothing
    // for Ade's contact (L2-122 AC1).
    [Fact]
    public async Task Another_persons_follow_ups_and_contacts_are_not_found()
    {
        using var api = new ApiFactory();
        var ade = await api.SignedUpAsync("Ade Bello", "(415) 555-0199");
        var adesContact = (await ade.AddedContactAsync("Tunde Bello")).GetProperty("id").GetGuid();
        var adesFollowUp = (await (await ade.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Call Tunde",
            contactId = adesContact,
        })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var tick = await mara.PutAsJsonAsync($"/api/contacts/follow-ups/{adesFollowUp}/done", new { done = true });
        var add = await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Call Tunde",
            contactId = adesContact,
        });

        await tick.AssertProblem(HttpStatusCode.NotFound, "follow_up_not_found");
        await add.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        Assert.Empty(await FollowUpsAsync(mara));
    }

    // Given Chidi's follow-up, when Chidi is deleted, then it goes with him (L2-132).
    [Fact]
    public async Task A_contacts_follow_ups_go_with_them()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        await mara.PostAsJsonAsync("/api/contacts/follow-ups", new { clientId = Guid.NewGuid(), text = "Ask Chidi", contactId = chidi });
        await mara.PostAsJsonAsync("/api/contacts/follow-ups", new { clientId = Guid.NewGuid(), text = "Call Sam" });

        (await mara.DeleteAsync($"/api/contacts/people/{chidi}")).EnsureSuccessStatusCode();

        var left = Assert.Single(await FollowUpsAsync(mara));
        Assert.Equal("Call Sam", left.GetProperty("text").GetString());
    }
}
