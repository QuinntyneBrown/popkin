using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>POST /api/popkins/{popkinId}/calls when a group call is under way (L2-029 AC1, AC2).</summary>
public sealed class JoinCallTests
{
    // Given a group call under way with the Host on it,
    // when another member posts,
    // then 200 answers the same call with a higher version and two on it, the participants in
    // the order they joined, and the joiner as the viewer.
    [Fact]
    public async Task A_member_joins_the_call_under_way()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMinutes(2));

        var response = await joel.StartOrJoinCallAsync(lakeside.Id, new { micOn = false });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var joined = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(started.CallId(), joined.CallId());
        Assert.Equal(started.GetProperty("call").GetProperty("startedAt").GetDateTimeOffset(), joined.GetProperty("call").GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(2, joined.GetProperty("call").GetProperty("version").GetInt64());
        Assert.Equal(2, joined.GetProperty("call").GetProperty("participantCount").GetInt32());
        Assert.Equal(["Mara Okafor", "Joel F"], joined.ParticipantNames());
        var joelOnCall = joined.GetProperty("participants")[1];
        Assert.Equal(joined.ViewerMembershipId(), joelOnCall.GetProperty("membershipId").GetGuid());
        Assert.NotEqual(started.ViewerMembershipId(), joined.ViewerMembershipId());
        Assert.Equal("Joel", joelOnCall.GetProperty("firstName").GetString());
        Assert.False(joelOnCall.GetProperty("micOn").GetBoolean());
        Assert.True(joelOnCall.GetProperty("cameraOn").GetBoolean());
        Assert.Equal(api.Clock.GetUtcNow(), joelOnCall.GetProperty("joinedAt").GetDateTimeOffset());
    }

    // Given a member who is on the call already,
    // when they post again, then 200 answers the same participant and nothing changes: the
    // count, the version and the time they joined stay as they were.
    [Fact]
    public async Task Joining_a_call_one_is_on_already_changes_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var started = await lakeside.Host.OnCallAsync(lakeside.Id, new { cameraOn = false });
        api.Clock.Advance(TimeSpan.FromMinutes(2));

        var response = await lakeside.Host.StartOrJoinCallAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var again = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(started.GetProperty("call").GetRawText(), again.GetProperty("call").GetRawText());
        Assert.Equal(started.ViewerMembershipId(), again.ViewerMembershipId());
        var mara = Assert.Single(again.GetProperty("participants").EnumerateArray());
        Assert.Equal(started.GetProperty("participants")[0].GetProperty("joinedAt").GetDateTimeOffset(), mara.GetProperty("joinedAt").GetDateTimeOffset());
        // The camera stays as the member has it on the call, whatever the repeat says.
        Assert.False(mara.GetProperty("cameraOn").GetBoolean());
    }

    // Given two members who start the call at the same moment,
    // when the second loses to the first on the way to the store,
    // then there is one call and both are on it: the loser joined the winner's (200).
    [Fact]
    public async Task Two_members_who_start_at_once_end_on_one_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        JsonElement? winner = null;
        api.Faults.LoseNextSaveTo = async () => winner = await lakeside.Host.OnCallAsync(lakeside.Id);

        var response = await joel.StartOrJoinCallAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var joined = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(winner!.Value.CallId(), joined.CallId());
        Assert.Equal(2, joined.GetProperty("call").GetProperty("version").GetInt64());
        Assert.Equal(2, joined.GetProperty("call").GetProperty("participantCount").GetInt32());
        // Both joined at the same instant, so neither is first.
        Assert.Equal(["Joel F", "Mara Okafor"], joined.ParticipantNames().Order());
    }
}
