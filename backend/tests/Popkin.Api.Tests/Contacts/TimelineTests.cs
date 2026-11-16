// Acceptance Test
// Traces to: L2-133, L2-134, L2-135, L2-122
// Description: Conversations and milestones are logged about a contact; promises go on follow-ups,
// a yearly milestone goes on Dates, and the profile's timeline lists them newest first.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Contacts;

public sealed class TimelineTests
{
    private const string LoggedAt = "2026-09-15T08:40:00-07:00";

    private static object Conversation(Guid clientId, string note, params object[] promises) => new
    {
        clientId,
        channel = "Phone",
        loggedAt = LoggedAt,
        note,
        promises,
    };

    private static object Milestone(Guid clientId, bool everyYear) => new
    {
        clientId,
        kind = "NewJob",
        title = "Started as Senior Engineer at Arup",
        happenedOn = "2026-08-31",
        note = "Bridges team.",
        everyYear,
    };

    private static async Task<JsonElement[]> TimelineAsync(HttpClient owner, Guid contact, string show = "all") =>
        (await owner.GetFromJsonAsync<JsonElement>($"/api/contacts/people/{contact}/timeline?show={show}"))
            .GetProperty("entries").EnumerateArray().ToArray();

    // Given Mara keeps Chidi, when she logs a phone call with the promise "Send him the
    // flat-hunting checklist" for Thursday, then the call heads his timeline and the promise is a
    // follow-up for him that says how and when it was made (L2-133 AC2, AC5, L2-135 AC1).
    [Fact]
    public async Task A_conversation_heads_the_timeline_and_its_promise_goes_on_follow_ups()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", Conversation(
            Guid.NewGuid(),
            "  He’s three weeks into Arup and finally sleeping again. ",
            new { text = "Send him the flat-hunting checklist", dueOn = "2026-09-17" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entries = await TimelineAsync(mara, chidi);
        var call = Assert.Single(entries);
        Assert.Equal("Conversation", call.GetProperty("kind").GetString());
        Assert.Equal("2026-09-15", call.GetProperty("day").GetString());
        Assert.Equal("Phone", call.GetProperty("channel").GetString());
        Assert.Equal("He’s three weeks into Arup and finally sleeping again.", call.GetProperty("note").GetString());
        Assert.Equal(JsonValueKind.Null, call.GetProperty("title").ValueKind);
        var promise = Assert.Single(await mara.GetFromJsonAsync<JsonElement[]>("/api/contacts/follow-ups") ?? []);
        Assert.Equal("Send him the flat-hunting checklist", promise.GetProperty("text").GetString());
        Assert.Equal(chidi, promise.GetProperty("contactId").GetGuid());
        Assert.True(promise.GetProperty("isPromise").GetBoolean());
        Assert.Equal("Phone", promise.GetProperty("promisedVia").GetString());
        Assert.Equal("2026-09-15", promise.GetProperty("promisedOn").GetString());
        Assert.Equal("2026-09-17", promise.GetProperty("dueOn").GetString());
    }

    // Given nothing in "What did you talk about?", when Save is chosen, then nothing is saved (L2-133 AC4).
    [Fact]
    public async Task A_conversation_needs_a_note()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", Conversation(Guid.NewGuid(), "   "));

        await response.AssertProblem(HttpStatusCode.BadRequest, "note_required");
        Assert.Empty(await TimelineAsync(mara, chidi));
    }

    // Given a promise with no words, when the conversation is saved, then nothing is saved (gap 106, ruled).
    [Fact]
    public async Task A_promise_needs_its_words()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", Conversation(
            Guid.NewGuid(), "Sunday lunch", new { text = " ", dueOn = "2026-09-17" }));

        await response.AssertProblem(HttpStatusCode.BadRequest, "promise_text_required");
        Assert.Empty(await TimelineAsync(mara, chidi));
    }

    // Given the same conversation sent twice, when the second arrives, then it is saved once (L2-124).
    [Fact]
    public async Task A_resend_saves_once()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        var body = Conversation(Guid.NewGuid(), "Sunday lunch", new { text = "Ring Mum’s clinic", dueOn = "2026-09-16" });

        await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", body);
        var again = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", body);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Single(await TimelineAsync(mara, chidi));
        Assert.Single(await mara.GetFromJsonAsync<JsonElement[]>("/api/contacts/follow-ups") ?? []);
    }

    // Given Lena's contact, when Mara logs about them or reads their timeline, then it is 404 (L2-122).
    [Fact]
    public async Task Another_persons_contact_has_no_timeline_for_you()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var bea = (await lena.AddedContactAsync("Bea Lind")).GetProperty("id").GetGuid();

        var log = await mara.PostAsJsonAsync($"/api/contacts/people/{bea}/conversations", Conversation(Guid.NewGuid(), "Hello"));
        var read = await mara.GetAsync($"/api/contacts/people/{bea}/timeline?show=all");

        await log.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
        await read.AssertProblem(HttpStatusCode.NotFound, "contact_not_found");
    }

    // Given "Remember this every year", when Chidi's new job is saved, then it is on his timeline as
    // a milestone and "Chidi's work anniversary" is on Dates, on the day (L2-134 AC2, AC3).
    [Fact]
    public async Task A_yearly_milestone_adds_a_key_date()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/milestones", Milestone(Guid.NewGuid(), everyYear: true));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var milestone = Assert.Single(await TimelineAsync(mara, chidi));
        Assert.Equal("Milestone", milestone.GetProperty("kind").GetString());
        Assert.Equal("NewJob", milestone.GetProperty("milestoneKind").GetString());
        Assert.Equal("2026-08-31", milestone.GetProperty("day").GetString());
        Assert.Equal("Started as Senior Engineer at Arup", milestone.GetProperty("title").GetString());
        var dates = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/dates?on=2026-09-15&kind=all");
        var anniversary = Assert.Single(dates.GetProperty("dates").EnumerateArray());
        Assert.Equal("Milestone", anniversary.GetProperty("kind").GetString());
        Assert.Equal("Chidi’s work anniversary", anniversary.GetProperty("title").GetString());
        Assert.Equal("2027-08-31", anniversary.GetProperty("occursOn").GetString());
        Assert.Equal("OnTheDay", anniversary.GetProperty("lead").GetString());
    }

    // Given a milestone with no "When", when it is saved, then nothing is saved (gap 106, ruled).
    [Fact]
    public async Task A_milestone_needs_its_day()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();

        var response = await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/milestones", new
        {
            clientId = Guid.NewGuid(),
            kind = "Moved",
            title = "Moved to Ancoats",
            everyYear = false,
        });

        await response.AssertProblem(HttpStatusCode.BadRequest, "happened_on_required");
    }

    // Given a call and a new job logged, when the timeline shows Milestones, then only the job is
    // listed; All lists both, newest first (L2-135 AC1).
    [Fact]
    public async Task The_timeline_filters_by_kind_newest_first()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/milestones", Milestone(Guid.NewGuid(), everyYear: false));
        await mara.PostAsJsonAsync($"/api/contacts/people/{chidi}/conversations", Conversation(Guid.NewGuid(), "First week at Arup"));

        var all = await TimelineAsync(mara, chidi);
        var milestones = await TimelineAsync(mara, chidi, "milestones");
        var conversations = await TimelineAsync(mara, chidi, "conversations");

        Assert.Equal(["Conversation", "Milestone"], all.Select(e => e.GetProperty("kind").GetString()));
        Assert.Equal("Milestone", Assert.Single(milestones).GetProperty("kind").GetString());
        Assert.Equal("Conversation", Assert.Single(conversations).GetProperty("kind").GetString());
    }
}
