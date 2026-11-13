using Microsoft.AspNetCore.SignalR.Client;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// The hub's `SendSignal` and the `Signal` event: one participant's offer, answer or candidate
/// relayed to one other and to nobody else (group-call, L2-051, L2-052 AC1).
/// </summary>
public sealed class CallSignalTests
{
    /// <summary>Three members on one call, each with their connection on it.</summary>
    private sealed record Cast(
        Guid PopkinId, string InviteCode, Guid CallId, HttpClient Mara, HubEvents MaraHub, Guid MaraId, HttpClient Joel, HubEvents JoelHub, Guid JoelId, HubEvents RuthHub, Guid RuthId)
        : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await MaraHub.DisposeAsync();
            await JoelHub.DisposeAsync();
            await RuthHub.DisposeAsync();
        }
    }

    private static async Task<Cast> ThreeOnACallAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var joelHub = await api.CreateHubConnectionAsync(joel);
        var ruthHub = await api.CreateHubConnectionAsync(ruth);
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        var joelOn = await joel.OnCallAsync(lakeside.Id);
        var ruthOn = await ruth.OnCallAsync(lakeside.Id);
        await maraHub.JoinCallAsync(started.CallId());
        await joelHub.JoinCallAsync(started.CallId());
        await ruthHub.JoinCallAsync(started.CallId());
        return new Cast(
            lakeside.Id, lakeside.Code, started.CallId(), lakeside.Host, maraHub, started.ViewerMembershipId(), joel, joelHub, joelOn.ViewerMembershipId(), ruthHub, ruthOn.ViewerMembershipId());
    }

    // Given three participants with their connections on the call,
    // when one sends an offer to another, who answers, and a candidate follows,
    // then each signal reaches the connection of the one it is for, with the call, the sender's
    // membership and the signal as sent, and the third participant receives none of them.
    [Fact]
    public async Task A_signal_reaches_the_participant_it_is_for_and_nobody_else()
    {
        using var api = new ApiFactory();
        await using var cast = await ThreeOnACallAsync(api);

        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "offer", "v=0\r\no=- 46117317 2 IN IP4 127.0.0.1\r\n");
        await cast.JoelHub.SendSignalAsync(cast.CallId, cast.MaraId, "answer", "v=0\r\no=- 99 2 IN IP4 127.0.0.1\r\n");
        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "candidate", "{\"candidate\":\"candidate:1 1 udp 2122260223 192.0.2.1 54321 typ host\"}");

        var offer = await cast.JoelHub.WaitForAsync("Signal", e => e.Arguments[2].GetProperty("type").GetString() == "offer");
        Assert.Equal(cast.CallId, offer.Arguments[0].GetGuid());
        Assert.Equal(cast.MaraId, offer.Arguments[1].GetGuid());
        Assert.Equal(["payload", "type"], offer.Arguments[2].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("v=0\r\no=- 46117317 2 IN IP4 127.0.0.1\r\n", offer.Arguments[2].GetProperty("payload").GetString());
        var answer = await cast.MaraHub.WaitForAsync("Signal");
        Assert.Equal(cast.JoelId, answer.Arguments[1].GetGuid());
        Assert.Equal("answer", answer.Arguments[2].GetProperty("type").GetString());
        var candidate = await cast.JoelHub.WaitForAsync("Signal", e => e.Arguments[2].GetProperty("type").GetString() == "candidate");
        Assert.Equal("{\"candidate\":\"candidate:1 1 udp 2122260223 192.0.2.1 54321 typ host\"}", candidate.Arguments[2].GetProperty("payload").GetString());
        // Signals are edges: each arrived once, in the order sent.
        Assert.Equal(["offer", "candidate"], cast.JoelHub.ReceivedNamed("Signal").Select(e => e.Arguments[2].GetProperty("type").GetString()));
        Assert.Single(cast.MaraHub.ReceivedNamed("Signal"));
        // A mute sent afterwards has reached the third participant, so nothing else is on its way to them.
        await cast.Mara.SetCallMediaAsync(cast.PopkinId, cast.CallId, new { micOn = false });
        await cast.RuthHub.WaitForAsync("ParticipantMediaChanged");
        Assert.Empty(cast.RuthHub.ReceivedNamed("Signal"));
    }

    // An offer or an answer is at most 32 KB and a candidate at most 2 KB. One of exactly that
    // size arrives whole, which is more than the hub's default message size allows.
    [Fact]
    public async Task A_signal_of_the_largest_size_allowed_arrives_whole()
    {
        using var api = new ApiFactory();
        await using var cast = await ThreeOnACallAsync(api);
        var offer = new string('o', 32 * 1024);
        var candidate = new string('c', 2 * 1024);

        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "offer", offer);
        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "candidate", candidate);

        var received = await cast.JoelHub.WaitForAsync("Signal", e => e.Arguments[2].GetProperty("type").GetString() == "candidate");
        Assert.Equal(candidate, received.Arguments[2].GetProperty("payload").GetString());
        Assert.Equal(offer, cast.JoelHub.ReceivedNamed("Signal")[0].Arguments[2].GetProperty("payload").GetString());
    }

    // A signal that breaks a rule is refused with validation_failed and relayed to nobody
    // (L2-052 AC1): a type that is not offer, answer or candidate, no payload, an offer or an
    // answer over 32 KB, a candidate over 2 KB, and no signal at all.
    [Theory]
    [InlineData("bye", "x")]
    [InlineData("Offer", "x")]
    [InlineData(null, "x")]
    [InlineData("offer", null)]
    [InlineData("offer", "")]
    [InlineData("offer", 32 * 1024 + 1)]
    [InlineData("answer", 32 * 1024 + 1)]
    [InlineData("candidate", 2 * 1024 + 1)]
    public async Task A_signal_that_breaks_a_rule_is_refused(string? type, object? payload)
    {
        using var api = new ApiFactory();
        await using var cast = await ThreeOnACallAsync(api);
        var text = payload is int length ? new string('x', length) : (string?)payload;

        await CallExtensions.AssertRefusedAsync(() => cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, type, text), "validation_failed");
        await CallExtensions.AssertRefusedAsync(
            () => cast.MaraHub.Connection.InvokeAsync("SendSignal", cast.CallId, cast.JoelId, (object?)null), "validation_failed");

        // The connection is still good, and the one signal that follows is the only one relayed.
        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "candidate", "after");
        await cast.JoelHub.WaitForAsync("Signal");
        Assert.Equal(["after"], cast.JoelHub.ReceivedNamed("Signal").Select(e => e.Arguments[2].GetProperty("payload").GetString()));
    }

    // Both ends of a signal are on the call: a sender who is not, a target who is not, who has
    // left, or whose connection has not joined the call, is call_not_found, and nothing is relayed.
    [Fact]
    public async Task A_signal_goes_only_between_two_participants_of_the_call()
    {
        using var api = new ApiFactory();
        await using var cast = await ThreeOnACallAsync(api);
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(cast.InviteCode, "Walt");
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        var waltId = (await walt.EveryoneThreadAsync(cast.PopkinId)).GetProperty("viewer").GetProperty("membershipId").GetGuid();

        // Walt is a member with Popkin open, and not on the call.
        await CallExtensions.AssertRefusedAsync(() => waltHub.SendSignalAsync(cast.CallId, cast.MaraId, "offer", "x"), "call_not_found");
        await CallExtensions.AssertRefusedAsync(() => cast.MaraHub.SendSignalAsync(cast.CallId, waltId, "offer", "x"), "call_not_found");
        await CallExtensions.AssertRefusedAsync(() => cast.MaraHub.SendSignalAsync(Guid.NewGuid(), cast.JoelId, "offer", "x"), "call_not_found");
        // On the call, but his connection has not joined it: there is nowhere to send a signal.
        await walt.OnCallAsync(cast.PopkinId);
        await CallExtensions.AssertRefusedAsync(() => cast.MaraHub.SendSignalAsync(cast.CallId, waltId, "offer", "x"), "call_not_found");
        // Joel has left.
        await cast.Joel.LeaveCallAsync(cast.PopkinId, cast.CallId);
        await CallExtensions.AssertRefusedAsync(() => cast.MaraHub.SendSignalAsync(cast.CallId, cast.JoelId, "offer", "x"), "call_not_found");
        await CallExtensions.AssertRefusedAsync(() => cast.JoelHub.SendSignalAsync(cast.CallId, cast.MaraId, "offer", "x"), "call_not_found");

        await cast.MaraHub.SendSignalAsync(cast.CallId, cast.RuthId, "offer", "to Ruth");
        await cast.RuthHub.WaitForAsync("Signal");
        Assert.Empty(cast.MaraHub.ReceivedNamed("Signal"));
        Assert.Empty(cast.JoelHub.ReceivedNamed("Signal"));
        Assert.Empty(waltHub.ReceivedNamed("Signal"));
    }

}
