// Acceptance Test
// Traces to: L2-146, L2-147, L2-148, L2-129, L2-130, L2-132, L2-122, known gaps 108 and 116 (ruled)
// Description: A group is made, listed by kind with its members and coming dates, has people added, is set from the contact form, starts a Popkin whose invite goes to its members once, and keeps going when a member is deleted.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class GroupsTests
{
    private const string On = "2026-09-15";

    private static async Task<JsonElement[]> GroupsAsync(HttpClient owner) =>
        (await owner.GetFromJsonAsync<JsonElement>($"/api/contacts/groups?on={On}")).EnumerateArray().ToArray();

    private static Task<HttpResponseMessage> MakeAsync(
        HttpClient owner, string name, string kind, Guid[] contactIds, string? note = null, Guid? clientId = null) =>
        owner.PostAsJsonAsync("/api/contacts/groups", new { clientId = clientId ?? Guid.NewGuid(), name, kind, note, contactIds });

    private static async Task<Guid> MadeAsync(HttpClient owner, string name, string kind, params Guid[] contactIds)
    {
        var response = await MakeAsync(owner, name, kind, contactIds);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<Guid> ContactAsync(HttpClient owner, string name, string? phone = null, string? email = null, string? knownAs = null)
    {
        var response = await owner.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name,
            knownAs = knownAs ?? "",
            phone = phone ?? "",
            email = email ?? "",
            loves = Array.Empty<string>(),
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task<string> CodeAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString()!;

    private static string[] Members(JsonElement group) =>
        group.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("fullName").GetString()!).ToArray();

    // Given Grace and Ben, when Mara makes "Sheffield lot", a small group, with a note, then
    // Groups lists it with its emoji, its members A to Z, how she knows each and its note, and a
    // resend saves once (L2-146 AC1, AC5, AC6; L2-147 AC1).
    [Fact]
    public async Task A_group_made_is_listed_with_its_members()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi", knownAs: "Best friend from uni");
        var ben = await ContactAsync(mara, "Ben Hale");
        var clientId = Guid.NewGuid();

        var made = await MakeAsync(mara, "Sheffield lot", "SmallGroup", [grace, ben], "Reunion weekend every October.", clientId);
        var again = await MakeAsync(mara, "Sheffield lot", "SmallGroup", [grace, ben], "Reunion weekend every October.", clientId);

        Assert.Equal(HttpStatusCode.Created, made.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var group = Assert.Single(await GroupsAsync(mara));
        Assert.Equal("Sheffield lot", group.GetProperty("name").GetString());
        Assert.Equal("SmallGroup", group.GetProperty("kind").GetString());
        Assert.Equal("🕯️", group.GetProperty("emoji").GetString());
        Assert.Equal("Reunion weekend every October.", group.GetProperty("note").GetString());
        Assert.Equal(["Ben Hale", "Grace Adeyemi"], Members(group));
        Assert.Equal("Best friend from uni", group.GetProperty("members")[1].GetProperty("knownAs").GetString());
        Assert.Equal(JsonValueKind.Null, group.GetProperty("popkin").ValueKind);
    }

    // The contact form reads the groups for their names, without the device's day: the API's own
    // day stands in (L2-147 AC6).
    [Fact]
    public async Task Groups_read_without_a_day_are_the_same_groups()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var grace = await ContactAsync(mara, "Grace Adeyemi");
        await MadeAsync(mara, "Sheffield lot", "SmallGroup", grace);

        var groups = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/groups");

        var group = Assert.Single(groups.EnumerateArray());
        Assert.Equal("Sheffield lot", group.GetProperty("name").GetString());
    }

    // No name, a name over 40, a note over 500, a kind not offered, and someone else's contact
    // are refused, and nothing is saved (L2-147 AC2, AC5; L2-122 AC1).
    [Theory]
    [InlineData("", "Household", false, "name_required")]
    [InlineData("A name that runs on far past forty characters", "Household", false, "name_too_long")]
    [InlineData("Book club", "Choir", false, "kind_not_allowed")]
    [InlineData("Book club", "Club", true, "note_too_long")]
    public async Task A_group_is_checked_before_it_is_saved(string name, string kind, bool longNote, string code)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var refused = await MakeAsync(mara, name, kind, [], longNote ? new string('n', 501) : null);

        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        Assert.Equal(code, await CodeAsync(refused));
        Assert.Empty(await GroupsAsync(mara));
    }

    [Fact]
    public async Task Only_the_owner_s_contacts_and_groups_are_used()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var sam = await api.SignedUpAsync("Sam Ito", "(415) 555-0199");
        var samsFriend = await ContactAsync(sam, "Femi Bankole");
        var samsGroup = await MadeAsync(sam, "Five-a-side", "Team");

        var withTheirs = await MakeAsync(mara, "Book club", "Club", [samsFriend]);
        var toTheirs = await mara.PostAsJsonAsync($"/api/contacts/groups/{samsGroup}/members", new { contactIds = Array.Empty<Guid>() });

        Assert.Equal(HttpStatusCode.NotFound, withTheirs.StatusCode);
        Assert.Equal("contact_not_found", await CodeAsync(withTheirs));
        Assert.Equal(HttpStatusCode.NotFound, toTheirs.StatusCode);
        Assert.Equal("group_not_found", await CodeAsync(toTheirs));
        Assert.Empty(await GroupsAsync(mara));
    }

    // Given Thursday Night Group with Walt, when Add people adds Walt and Ruth, then Walt is left
    // as he is and Ruth joins after him (L2-147 AC3, L2-146 AC5).
    [Fact]
    public async Task Adding_people_leaves_those_in_it_alone()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var walt = await ContactAsync(mara, "Walt Brennan");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        var group = await MadeAsync(mara, "Thursday Night Group", "SmallGroup", walt);
        api.Clock.Advance(TimeSpan.FromMinutes(1));

        var added = await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/members", new { contactIds = new[] { walt, ruth } });

        Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        Assert.Equal(["Walt Brennan", "Ruth Lindqvist"], Members(await added.Content.ReadFromJsonAsync<JsonElement>()));
    }

    // Given Ruth's birthday on Oct 24 and Walt's on Nov 16 and one next August, when the group is
    // read on Sep 15, then "Coming up" holds the members' next dates within a year, at most three,
    // soonest first (L2-146 AC5).
    [Fact]
    public async Task Coming_up_holds_the_members_next_dates()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var walt = await ContactAsync(mara, "Walt Brennan");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        foreach (var (contact, month, day) in new[] { (walt, 11, 16), (ruth, 10, 24), (ruth, 8, 30), (walt, 9, 1) })
        {
            (await mara.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
            {
                clientId = Guid.NewGuid(),
                kind = "Other",
                title = $"Day {month}-{day}",
                month,
                day,
                everyYear = true,
                lead = "OnTheDay",
            })).EnsureSuccessStatusCode();
        }

        await MadeAsync(mara, "Thursday Night Group", "SmallGroup", walt, ruth);

        var comingUp = Assert.Single(await GroupsAsync(mara)).GetProperty("comingUp").EnumerateArray()
            .Select(d => d.GetProperty("occursOn").GetString()!).ToArray();
        Assert.Equal(["2026-10-24", "2026-11-16", "2027-08-30"], comingUp);
    }

    // Given groups, when Add someone and then Edit send the groups pressed, then the contact is in
    // those and taken out of the rest; Edit without them leaves them alone (L2-147 AC6).
    [Fact]
    public async Task The_contact_form_sets_a_contact_s_groups()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var sheffield = await MadeAsync(mara, "Sheffield lot", "SmallGroup");
        var tigers = await MadeAsync(mara, "Tigers U9", "Team");

        var added = await mara.AddContactAsync(new { clientId = Guid.NewGuid(), name = "Grace Adeyemi", loves = Array.Empty<string>(), groupIds = new[] { sheffield } });
        var profile = await added.Content.ReadFromJsonAsync<JsonElement>();
        var grace = profile.GetProperty("id").GetGuid();
        Assert.Equal(["Sheffield lot"], profile.GetProperty("groups").EnumerateArray().Select(g => g.GetProperty("name").GetString()!));

        (await mara.EditContactAsync(grace, new { clientId = Guid.NewGuid(), name = "Grace Adeyemi", loves = Array.Empty<string>(), groupIds = new[] { tigers } })).EnsureSuccessStatusCode();
        var edited = await mara.EditContactAsync(grace, new { clientId = Guid.NewGuid(), name = "Grace Adeyemi", loves = Array.Empty<string>() });

        var groups = (await edited.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("groups").EnumerateArray().ToArray();
        Assert.Equal("Tigers U9", Assert.Single(groups).GetProperty("name").GetString());
        Assert.Equal("🤝", groups[0].GetProperty("emoji").GetString());
        var listed = await GroupsAsync(mara);
        Assert.Empty(Members(listed.Single(g => g.GetProperty("name").GetString() == "Sheffield lot")));
    }

    // Given Grace with a phone, Ben with only an email and Iris with neither, when Mara starts a
    // Popkin with Sheffield lot, then it is linked, Grace is texted and Ben emailed once, however
    // often it is asked, and "Open" shows the Popkin (L2-148 AC1, AC3, AC5).
    [Fact]
    public async Task Starting_a_Popkin_with_a_group_invites_its_members_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = lakeside.Host;
        var grace = await ContactAsync(mara, "Grace Adeyemi", phone: "(415) 555-0177");
        var ben = await ContactAsync(mara, "Ben Hale", email: "ben@example.com");
        var iris = await ContactAsync(mara, "Iris Hale");
        var group = await MadeAsync(mara, "Sheffield lot", "SmallGroup", grace, ben, iris);

        var linked = await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/popkin", new { popkinId = lakeside.Id });
        var again = await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/popkin", new { popkinId = lakeside.Id });

        Assert.Equal(HttpStatusCode.Accepted, linked.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, again.StatusCode);
        var sent = api.CrewInvites.Sent.OrderBy(s => s.Channel).ToList();
        Assert.Equal(2, sent.Count);
        Assert.Equal((ContactChannel.Phone, "(415) 555-0177"), (sent[0].Channel, sent[0].Destination));
        Assert.Equal((ContactChannel.Email, "ben@example.com"), (sent[1].Channel, sent[1].Destination));
        Assert.Equal("Lakeside Weekend", sent[0].Invite.PopkinName);
        Assert.Equal("Mara", sent[0].Invite.HostFirstName);
        var popkin = Assert.Single(await GroupsAsync(mara)).GetProperty("popkin");
        Assert.Equal(lakeside.Id, popkin.GetProperty("id").GetGuid());
        Assert.Equal("Lakeside Weekend", popkin.GetProperty("name").GetString());
    }

    // Given a group linked to a Popkin, when Mara leaves it, then the group shows no Popkin and a
    // new start links it again; a Popkin she is still in refuses another (L2-148 AC4).
    [Fact]
    public async Task A_group_shows_its_Popkin_while_the_person_is_in_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = lakeside.Host;
        var group = await MadeAsync(mara, "Sheffield lot", "SmallGroup");
        (await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/popkin", new { popkinId = lakeside.Id })).EnsureSuccessStatusCode();
        var second = await mara.PostAsJsonAsync("/api/popkins", new { name = "Reunion", emoji = "🎉", colour = "Coral", length = "KeepItGoing" });
        var secondId = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        var refused = await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/popkin", new { popkinId = secondId });
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Memberships.Single(m => m.PopkinId == lakeside.Id && m.PersonId == lakeside.HostPersonId).Leave(api.Clock.GetUtcNow());
            await db.SaveChangesAsync();
        }

        var afterLeaving = Assert.Single(await GroupsAsync(mara)).GetProperty("popkin").ValueKind;
        var relinked = await mara.PostAsJsonAsync($"/api/contacts/groups/{group}/popkin", new { popkinId = secondId });

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("group_linked_elsewhere", await CodeAsync(refused));
        Assert.Equal(JsonValueKind.Null, afterLeaving);
        Assert.Equal(HttpStatusCode.Accepted, relinked.StatusCode);
        Assert.Equal("Reunion", Assert.Single(await GroupsAsync(mara)).GetProperty("popkin").GetProperty("name").GetString());
    }

    // Given a group of Walt and Ruth, when Ruth is deleted, then Walt stays in it (L2-132, L2-147 AC7).
    [Fact]
    public async Task A_deleted_contact_leaves_the_group_and_the_group_stays()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var walt = await ContactAsync(mara, "Walt Brennan");
        var ruth = await ContactAsync(mara, "Ruth Lindqvist");
        await MadeAsync(mara, "Thursday Night Group", "SmallGroup", walt, ruth);

        (await mara.DeleteAsync($"/api/contacts/people/{ruth}")).EnsureSuccessStatusCode();

        Assert.Equal(["Walt Brennan"], Members(Assert.Single(await GroupsAsync(mara))));
    }
}
