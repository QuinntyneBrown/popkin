using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Calls;
using Popkin.Application.Realtime;

namespace Popkin.Api.Tests.Calls;

/// <summary>A participant whose connection drops leaves the call after a grace of 20 seconds, unless they come back (group-call).</summary>
public sealed class CallDisconnectTests
{
    private static async Task<int> CountOnCallAsync(HttpClient member, Guid popkinId) =>
        (await (await member.CurrentCallAsync(popkinId)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("participantCount").GetInt32();

    // Given two participants with their connections on the call,
    // when one's connection drops,
    // then they are still on the call until 20 seconds have passed without them coming back;
    // then the other is told they left and the banner's count goes down.
    [Fact]
    public async Task A_participant_whose_connection_drops_leaves_only_after_the_20_second_grace()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var joelHub = await api.CreateHubConnectionAsync(joel);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        var joelId = (await joel.OnCallAsync(lakeside.Id)).ViewerMembershipId();
        await maraHub.JoinCallAsync(callId);
        await joelHub.JoinCallAsync(callId);

        await joelHub.DisposeAsync();
        await api.Requests.WaitForAsync<DisconnectFromHubCommand>();
        api.Clock.Advance(CallDisconnectGrace.Grace - TimeSpan.FromMilliseconds(1));
        var during = await CountOnCallAsync(lakeside.Host, lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMilliseconds(1));

        Assert.Equal(2, during);
        var left = await maraHub.WaitForAsync("ParticipantLeft");
        Assert.Equal(callId, left.Arguments[0].GetGuid());
        Assert.Equal(joelId, left.Arguments[1].GetGuid());
        var changed = await maraHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 3);
        Assert.Equal(1, changed.Arguments[3].GetInt32());
        Assert.Equal(1, await CountOnCallAsync(lakeside.Host, lakeside.Id));
    }

    // Given a participant whose connection dropped,
    // when they connect again and join the call's connections within the grace,
    // then they stay on the call when the grace has passed, nobody is told they left, and
    // their new connection is the one signals reach.
    [Fact]
    public async Task A_participant_who_comes_back_within_the_grace_stays_on_the_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var dropped = await api.CreateHubConnectionAsync(joel);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        var joelId = (await joel.OnCallAsync(lakeside.Id)).ViewerMembershipId();
        await maraHub.JoinCallAsync(callId);
        await dropped.JoinCallAsync(callId);

        await dropped.DisposeAsync();
        await api.Requests.WaitForAsync<DisconnectFromHubCommand>();
        api.Clock.Advance(TimeSpan.FromSeconds(12));
        await using var back = await api.CreateHubConnectionAsync(joel);
        await back.JoinCallAsync(callId);
        api.Clock.Advance(TimeSpan.FromSeconds(8));
        await api.Requests.WaitForAsync<LeaveDroppedCallCommand>();

        Assert.Equal(2, await CountOnCallAsync(lakeside.Host, lakeside.Id));
        await maraHub.SendSignalAsync(callId, joelId, "offer", "again");
        await back.WaitForAsync("Signal");
        Assert.Empty(maraHub.ReceivedNamed("ParticipantLeft"));
    }

    // Given the only participant of a call,
    // when their connection drops and the grace passes, then the call ends for everyone (L2-029 AC6).
    [Fact]
    public async Task The_call_ends_when_its_last_participant_dropped_and_did_not_come_back()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await maraHub.JoinCallAsync(callId);

        await maraHub.DisposeAsync();
        await api.Requests.WaitForAsync<DisconnectFromHubCommand>();
        api.Clock.Advance(CallDisconnectGrace.Grace);

        var ended = await joelHub.WaitForAsync("CallEnded");
        Assert.Equal(callId, ended.Arguments[1].GetGuid());
        Assert.Equal(HttpStatusCode.NoContent, (await joel.CurrentCallAsync(lakeside.Id)).StatusCode);
    }

    // Given a participant with Popkin open in a second tab that is not on the call,
    // when that tab closes and the grace passes, then they are still on the call: only the
    // connection they are on the call with counts.
    [Fact]
    public async Task Closing_a_connection_that_is_not_on_the_call_takes_nobody_off_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await using var onCall = await api.CreateHubConnectionAsync(lakeside.Host);
        var otherTab = await api.CreateHubConnectionAsync(lakeside.Host);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await onCall.JoinCallAsync(callId);

        await otherTab.DisposeAsync();
        await api.Requests.WaitForAsync<DisconnectFromHubCommand>();
        api.Clock.Advance(CallDisconnectGrace.Grace + TimeSpan.FromSeconds(1));

        // A mute after the grace still reaches the connection on the call, so the participant is on it.
        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { micOn = false })).StatusCode);
        await onCall.WaitForAsync("ParticipantMediaChanged");
        Assert.Equal(1, await CountOnCallAsync(lakeside.Host, lakeside.Id));
        Assert.Empty(onCall.ReceivedNamed("ParticipantLeft"));
    }
}
