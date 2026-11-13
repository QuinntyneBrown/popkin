using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Members;

/// <summary>DELETE /api/popkins/{popkinId}/members/me: a member who is not the Host leaves (L2-047).</summary>
public sealed class LeavePopkinTests
{
    private static Task<HttpResponseMessage> LeaveAsync(HttpClient member, Guid popkinId) =>
        member.DeleteAsync($"/api/popkins/{popkinId}/members/me");

    // Given Joel, a member of Lakeside Weekend who wrote to everyone,
    // when Joel leaves,
    // then it answers 204, his Popkins no longer list Lakeside Weekend, the Host counts one
    // member fewer, and what Joel wrote stays, under the name he went by.
    [Fact]
    public async Task A_member_leaves_and_what_they_wrote_stays()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "Count me in for the canoe");

        var response = await LeaveAsync(joel, lakeside.Id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var mine = await joel.GetFromJsonAsync<JsonElement>("/api/popkins");
        Assert.Empty(mine.GetProperty("active").EnumerateArray());
        var home = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        Assert.Equal(1, home.GetProperty("memberCount").GetInt32());
        var messages = await lakeside.Host.MessagesAsync(lakeside.Id, threadId);
        var written = messages.GetProperty("items").EnumerateArray().Single(m => m.GetProperty("kind").GetString() == "Member");
        Assert.Equal("Count me in for the canoe", written.GetProperty("text").GetString());
        Assert.Equal("Joel", written.GetProperty("author").GetProperty("firstName").GetString());
    }

    // Given the Host and Joel with Popkin open,
    // when Joel leaves,
    // then the Host is told who left (MemberLeft) and Joel is not; and from then on Joel's
    // connection hears nothing more of Lakeside Weekend.
    [Fact]
    public async Task The_others_are_told_who_left_and_the_one_who_left_hears_no_more()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira")).Content.ReadFromJsonAsync<JsonElement>();
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 2);

        await LeaveAsync(joel, lakeside.Id);

        var left = await maraHub.WaitForAsync("MemberLeft");
        Assert.Equal(lakeside.Id, left.Arguments[0].GetGuid());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), left.Arguments[1].GetGuid());
        // Joel is no longer here now.
        await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1);
        var fromMara = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Safe travels, Joel");
        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == fromMara.GetProperty("id").GetGuid());
        Assert.Empty(joelHub.ReceivedNamed("MemberLeft"));
        Assert.Empty(joelHub.ReceivedNamed("MessageAdded"));
    }

    // Given Joel on the group call with the Host,
    // when Joel leaves the Popkin,
    // then he is off the call too: the Host's call has one participant.
    [Fact]
    public async Task Leaving_takes_the_member_off_the_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        await lakeside.Host.OnCallAsync(lakeside.Id);
        await joel.OnCallAsync(lakeside.Id);

        await LeaveAsync(joel, lakeside.Id);

        var call = await (await lakeside.Host.CurrentCallAsync(lakeside.Id)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, call.GetProperty("participantCount").GetInt32());
    }
}
