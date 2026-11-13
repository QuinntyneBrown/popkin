using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// The hub's `JoinCall` and the `ParticipantJoined` and `ParticipantLeft` events it opens,
/// sent to the connections on the call and to no other (group-call, L2-051).
/// </summary>
public sealed class CallParticipantsLiveTests
{
    // Given the Host on the call with their connection joined to it,
    // when another member joins the call,
    // then the Host's connection receives ParticipantJoined with the call and the joiner as
    // the participants read gives them; and when the Host then leaves, the joiner's connection
    // receives ParticipantLeft with the Host's membership.
    [Fact]
    public async Task The_connections_on_a_call_are_told_who_joins_and_who_leaves()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        await maraHub.JoinCallAsync(started.CallId());

        var joined = await joel.OnCallAsync(lakeside.Id, new { cameraOn = false });
        await joelHub.JoinCallAsync(joined.CallId());

        var arrived = await maraHub.WaitForAsync("ParticipantJoined");
        Assert.Equal(started.CallId(), arrived.Arguments[0].GetGuid());
        Assert.Equal(joined.Viewer().GetRawText(), arrived.Arguments[1].GetRawText());
        Assert.Equal("Joel", arrived.Arguments[1].GetProperty("firstName").GetString());
        Assert.False(arrived.Arguments[1].GetProperty("cameraOn").GetBoolean());

        await lakeside.Host.LeaveCallAsync(lakeside.Id, started.CallId());

        var left = await joelHub.WaitForAsync("ParticipantLeft");
        Assert.Equal(started.CallId(), left.Arguments[0].GetGuid());
        Assert.Equal(started.ViewerMembershipId(), left.Arguments[1].GetGuid());
        // The joiner was not on the call's connections when they joined, so they were not told of themselves.
        Assert.Empty(joelHub.ReceivedNamed("ParticipantJoined"));
    }

    // Given a member with Popkin open who is not on the call, and one who has left it,
    // when someone joins the call,
    // then neither is told who: they have the banner's count and nothing more.
    [Fact]
    public async Task A_connection_that_is_not_on_the_call_is_not_told_who_is()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        await using var ruthHub = await api.CreateHubConnectionAsync(ruth);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await maraHub.JoinCallAsync(callId);
        await joel.OnCallAsync(lakeside.Id);
        await joelHub.JoinCallAsync(callId);
        await joel.LeaveCallAsync(lakeside.Id, callId);
        await maraHub.WaitForAsync("ParticipantLeft");

        await ruth.OnCallAsync(lakeside.Id);

        var arrived = await maraHub.WaitForAsync("ParticipantJoined", e => e.Arguments[1].GetProperty("firstName").GetString() == "Ruth");
        Assert.Equal(callId, arrived.Arguments[0].GetGuid());
        // The count of that join is sent after its ParticipantJoined, so once it has arrived nothing else is on its way.
        await joelHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 4);
        await ruthHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 4);
        Assert.Empty(joelHub.ReceivedNamed("ParticipantJoined"));
        Assert.Empty(joelHub.ReceivedNamed("ParticipantLeft"));
        Assert.Empty(ruthHub.ReceivedNamed("ParticipantJoined"));
    }

    // Given a call, when a connection asks to join it for someone who is not on it, then the
    // hub refuses with call_not_found, the code the same refusal has over HTTP: a member who
    // never joined, a call that does not exist, and a person who is not a member, who learns
    // nothing of the call's existence.
    [Fact]
    public async Task Only_a_participants_connection_joins_the_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        await using var strangerHub = await api.CreateHubConnectionAsync(stranger);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();

        await CallExtensions.AssertRefusedAsync(() => joelHub.JoinCallAsync(callId), "call_not_found");
        await CallExtensions.AssertRefusedAsync(() => maraHub.JoinCallAsync(Guid.NewGuid()), "call_not_found");
        await CallExtensions.AssertRefusedAsync(() => strangerHub.JoinCallAsync(callId), "call_not_found");

        // The refused connection hears nothing of the call's participants; the Host's does.
        await maraHub.JoinCallAsync(callId);
        await joel.OnCallAsync(lakeside.Id);
        await maraHub.WaitForAsync("ParticipantJoined");
        await joelHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 2);
        Assert.Empty(joelHub.ReceivedNamed("ParticipantJoined"));
    }
}
