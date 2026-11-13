using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// PATCH /api/popkins/{popkinId}/calls/{callId}/participants/me and the
/// `ParticipantMediaChanged` event (L2-030 AC2, AC3, AC5).
/// </summary>
public sealed class CallMediaTests
{
    // Given two members on a call, each with their connection on it,
    // when one mutes and then turns the camera off,
    // then each change is 204 and reaches both connections as ParticipantMediaChanged with
    // the call, the member, a version that rises and both values in full; and whoever reads
    // the participants next finds the member that way.
    [Fact]
    public async Task A_participant_mutes_and_turns_the_camera_off_and_the_others_are_told()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        await maraHub.JoinCallAsync(started.CallId());
        await joel.OnCallAsync(lakeside.Id);
        await joelHub.JoinCallAsync(started.CallId());

        var muted = await lakeside.Host.SetCallMediaAsync(lakeside.Id, started.CallId(), new { micOn = false });

        Assert.Equal(HttpStatusCode.NoContent, muted.StatusCode);
        var first = await joelHub.WaitForAsync("ParticipantMediaChanged", e => e.Arguments[2].GetInt64() == 1);
        Assert.Equal(started.CallId(), first.Arguments[0].GetGuid());
        Assert.Equal(started.ViewerMembershipId(), first.Arguments[1].GetGuid());
        Assert.False(first.Arguments[3].GetBoolean());
        Assert.True(first.Arguments[4].GetBoolean());

        var cameraOff = await lakeside.Host.SetCallMediaAsync(lakeside.Id, started.CallId(), new { cameraOn = false });

        Assert.Equal(HttpStatusCode.NoContent, cameraOff.StatusCode);
        var second = await joelHub.WaitForAsync("ParticipantMediaChanged", e => e.Arguments[2].GetInt64() == 2);
        Assert.False(second.Arguments[3].GetBoolean());
        Assert.False(second.Arguments[4].GetBoolean());
        // The member's own connection is told too, so another of their tabs follows.
        await maraHub.WaitForAsync("ParticipantMediaChanged", e => e.Arguments[2].GetInt64() == 2);
        var mara = (await lakeside.Host.OnCallAsync(lakeside.Id)).Viewer();
        Assert.False(mara.GetProperty("micOn").GetBoolean());
        Assert.False(mara.GetProperty("cameraOn").GetBoolean());
        Assert.Equal(2, mara.GetProperty("mediaVersion").GetInt64());
    }

    // Given a participant whose microphone is on,
    // when they record it as on again and then both values at once,
    // then the repeat is 204 and announced to nobody, and the change of both is one event.
    [Fact]
    public async Task A_state_that_is_held_already_is_not_announced_and_two_values_change_as_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await using var hub = await api.CreateHubConnectionAsync(lakeside.Host);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await hub.JoinCallAsync(callId);

        var repeat = await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { micOn = true });
        var both = await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { micOn = false, cameraOn = false });

        Assert.Equal(HttpStatusCode.NoContent, repeat.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, both.StatusCode);
        var changed = await hub.WaitForAsync("ParticipantMediaChanged");
        Assert.Equal(1, changed.Arguments[2].GetInt64());
        Assert.False(changed.Arguments[3].GetBoolean());
        Assert.False(changed.Arguments[4].GetBoolean());
        Assert.Single(hub.ReceivedNamed("ParticipantMediaChanged"));
    }

    // Given a member with Popkin open who is not on the call,
    // when a participant mutes, then that member's connection is not told.
    [Fact]
    public async Task A_connection_that_is_not_on_the_call_is_not_told_of_a_mute()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await maraHub.JoinCallAsync(callId);

        await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { micOn = false });
        await maraHub.WaitForAsync("ParticipantMediaChanged");
        await lakeside.Host.LeaveCallAsync(lakeside.Id, callId);

        // The end of the call is sent after the mute, so once it has arrived nothing else is on its way.
        await joelHub.WaitForAsync("CallEnded");
        Assert.Empty(joelHub.ReceivedNamed("ParticipantMediaChanged"));
    }

    // A body that names neither the microphone nor the camera, or gives one a value that is
    // not true or false, is 400 with a code, and changes nothing (L2-052 AC1).
    [Fact]
    public async Task A_change_that_names_neither_the_microphone_nor_the_camera_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();

        await (await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { })).AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
        await (await lakeside.Host.SetCallMediaAsync(lakeside.Id, callId, new { micOn = "loud" })).AssertProblem(HttpStatusCode.BadRequest, "validation_failed");

        Assert.Equal(0, (await lakeside.Host.OnCallAsync(lakeside.Id)).Viewer().GetProperty("mediaVersion").GetInt64());
    }

    // Each person controls only their own microphone and camera, on a call they are on: a
    // member who is not on the call, or who has left it, gets 404 call_not_found; a person who
    // is not a member 404 popkin_not_found; no session 401 (L2-050, L2-051).
    [Fact]
    public async Task Only_someone_on_the_call_records_their_microphone_and_camera()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        var body = new { micOn = false };

        await (await joel.SetCallMediaAsync(lakeside.Id, callId, body)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await lakeside.Host.SetCallMediaAsync(lakeside.Id, Guid.NewGuid(), body)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await stranger.SetCallMediaAsync(lakeside.Id, callId, body)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().SetCallMediaAsync(lakeside.Id, callId, body)).StatusCode);
        Assert.True((await lakeside.Host.OnCallAsync(lakeside.Id)).Viewer().GetProperty("micOn").GetBoolean());

        await joel.OnCallAsync(lakeside.Id);
        await joel.LeaveCallAsync(lakeside.Id, callId);
        await (await joel.SetCallMediaAsync(lakeside.Id, callId, body)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
    }
}
