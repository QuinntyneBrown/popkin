using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Invites;

/// <summary>Joining tells the Popkin: the "popped in" note in Everyone and `MemberJoined` (L2-014 AC4).</summary>
public sealed class PoppedInTests
{
    // Given a Popkin its Host has just started, then Everyone holds no note: the Host did not pop in.
    // When a person joins, then Everyone gains a system message at the time they joined, by
    // their membership, reading "{display name} popped in. Say hi! 👋".
    [Fact]
    public async Task Joining_adds_a_popped_in_note_to_Everyone_at_the_time_of_joining()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var atStart = await lakeside.Host.MessagesAsync(lakeside.Id, threadId);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel F")).Content.ReadFromJsonAsync<JsonElement>();
        api.Clock.Advance(TimeSpan.FromMinutes(1));

        Assert.Empty(atStart.Texts());
        var note = Assert.Single((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray());
        Assert.Equal("System", note.GetProperty("kind").GetString());
        Assert.Equal("Joel F popped in. Say hi! 👋", note.GetProperty("text").GetString());
        Assert.Equal(api.Clock.GetUtcNow().AddMinutes(-1), note.GetProperty("sentAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, note.GetProperty("clientMessageId").ValueKind);
        Assert.Equal(threadId, note.GetProperty("threadId").GetGuid());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), note.GetProperty("author").GetProperty("membershipId").GetGuid());
        Assert.Equal("Joel", note.GetProperty("author").GetProperty("firstName").GetString());
        // The note is unread for the others and not for the one it is about.
        Assert.Equal(1, (await lakeside.Host.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
        Assert.Equal(0, (await joel.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
    }

    // Given the Host with Popkin open, and a person with Popkin open who is not yet a member,
    // when that person joins,
    // then the Host is told who joined (MemberJoined) and receives the note (MessageAdded);
    // the joiner is not told of their own joining, but from then on receives the Popkin's
    // events on the connection they already hold, and their messages reach the others.
    [Fact]
    public async Task The_members_are_told_who_joined_and_the_joiner_starts_receiving()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1);

        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel F")).Content.ReadFromJsonAsync<JsonElement>();

        var memberJoined = await maraHub.WaitForAsync("MemberJoined");
        Assert.Equal(lakeside.Id, memberJoined.Arguments[0].GetGuid());
        var member = memberJoined.Arguments[1];
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), member.GetProperty("membershipId").GetGuid());
        Assert.Equal("Joel", member.GetProperty("firstName").GetString());
        Assert.Equal("JF", member.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(["avatar", "firstName", "membershipId"], member.EnumerateObject().Select(p => p.Name).Order());
        var note = await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("kind").GetString() == "System");
        Assert.Equal("Joel F popped in. Say hi! 👋", note.Arguments[0].GetProperty("text").GetString());
        // Joel is here now too, on the connection he already held.
        await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 2);

        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var fromJoel = await joel.SentMessageAsync(lakeside.Id, threadId, "Hi everyone!");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var fromMara = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Welcome, Joel");

        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == fromJoel.GetProperty("id").GetGuid());
        await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == fromMara.GetProperty("id").GetGuid());
        Assert.Empty(joelHub.ReceivedNamed("MemberJoined"));
    }

    // Given a member, when they press "I'm in" again,
    // then no second note is added and nobody is told again.
    [Fact]
    public async Task Joining_again_adds_no_second_note_and_tells_nobody()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        api.Clock.Advance(TimeSpan.FromSeconds(1));

        var again = await joel.JoinAsync(lakeside.Code, "Joel F");
        var marker = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Welcome, Joel");

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == marker.GetProperty("id").GetGuid());
        Assert.Empty(maraHub.ReceivedNamed("MemberJoined"));
        Assert.Single(maraHub.ReceivedNamed("MessageAdded"));
        Assert.Equal(["Joel F popped in. Say hi! 👋", "Welcome, Joel"], (await joel.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a join whose save fails, then nobody joined and no note was written.
    [Fact]
    public async Task A_join_that_fails_leaves_no_note()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        api.Faults.FailSaves = true;

        await (await joel.JoinAsync(lakeside.Code, "Joel F")).AssertProblem(HttpStatusCode.InternalServerError, "server_error");

        api.Faults.FailSaves = false;
        Assert.Empty((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }
}
