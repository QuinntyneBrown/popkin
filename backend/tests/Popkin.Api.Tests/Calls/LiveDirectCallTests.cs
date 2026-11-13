using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// The hub on a direct call: `CallChanged` and `CallEnded` name its thread and go to its two
/// members only, and nobody else puts a connection on it or signals through it (L2-030 AC8,
/// L2-023 AC2, L2-045 AC1, L2-051).
/// </summary>
public sealed class LiveDirectCallTests
{
    /// <summary>Mara, Walt and Ruth in Lakeside with Popkin open, and the direct message between Mara and Walt.</summary>
    private sealed record Cast(
        Guid PopkinId, Guid ThreadId, HttpClient Mara, HubEvents MaraHub, HttpClient Walt, HubEvents WaltHub, HttpClient Ruth, HubEvents RuthHub)
        : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            await MaraHub.DisposeAsync();
            await WaltHub.DisposeAsync();
            await RuthHub.DisposeAsync();
        }
    }

    private static async Task<Cast> WithPopkinOpenAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var threadId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        return new Cast(
            lakeside.Id,
            threadId,
            lakeside.Host,
            await api.CreateHubConnectionAsync(lakeside.Host),
            walt,
            await api.CreateHubConnectionAsync(walt),
            ruth,
            await api.CreateHubConnectionAsync(ruth));
    }

    // Given three members with Popkin open, two of whom have a direct message,
    // when one of the two starts its call, the other joins, and both leave,
    // then each change reaches the two as CallChanged with the thread as its last argument,
    // and the end as CallEnded with the thread; the third member, who then hears of the group
    // call with no thread, heard nothing of the direct call before it.
    [Fact]
    public async Task A_direct_call_is_told_to_its_two_members_and_nobody_else()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);

        var callId = (await cast.Mara.OnDirectCallAsync(cast.PopkinId, cast.ThreadId)).CallId();
        await cast.Walt.OnDirectCallAsync(cast.PopkinId, cast.ThreadId);
        await cast.Mara.LeaveCallAsync(cast.PopkinId, callId);
        await cast.Walt.LeaveCallAsync(cast.PopkinId, callId);

        foreach (var hub in new[] { cast.MaraHub, cast.WaltHub })
        {
            var ended = await hub.WaitForAsync("CallEnded");
            Assert.Equal(cast.PopkinId, ended.Arguments[0].GetGuid());
            Assert.Equal(callId, ended.Arguments[1].GetGuid());
            Assert.Equal(cast.ThreadId, ended.Arguments[2].GetGuid());
            var changes = hub.ReceivedNamed("CallChanged");
            Assert.Equal([1L, 2L, 3L], changes.Select(e => e.Arguments[2].GetInt64()));
            Assert.Equal([1, 2, 1], changes.Select(e => e.Arguments[3].GetInt32()));
            Assert.All(changes, e => Assert.Equal(cast.ThreadId, e.Arguments[4].GetGuid()));
        }

        // The group call is told to the Popkin, naming no thread, and the third member hears it.
        var groupId = (await cast.Ruth.OnCallAsync(cast.PopkinId)).CallId();
        var group = await cast.RuthHub.WaitForAsync("CallChanged");
        Assert.Equal(groupId, group.Arguments[1].GetGuid());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, group.Arguments[4].ValueKind);
        await cast.MaraHub.WaitForAsync("CallChanged", e => e.Arguments[1].GetGuid() == groupId);
        Assert.Single(cast.RuthHub.ReceivedNamed("CallChanged"));
        Assert.Empty(cast.RuthHub.ReceivedNamed("CallEnded"));
    }

    // Given a direct call under way,
    // when the third member puts a connection on it or signals to one of the two through it,
    // then the hub refuses with call_not_found, as for a call that does not exist.
    [Fact]
    public async Task Nobody_else_connects_to_or_signals_through_a_direct_call()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);
        var joined = await cast.Mara.OnDirectCallAsync(cast.PopkinId, cast.ThreadId);
        await cast.MaraHub.JoinCallAsync(joined.CallId());

        await CallExtensions.AssertRefusedAsync(() => cast.RuthHub.JoinCallAsync(joined.CallId()), "call_not_found");
        await CallExtensions.AssertRefusedAsync(
            () => cast.RuthHub.SendSignalAsync(joined.CallId(), joined.ViewerMembershipId(), "offer", "x"), "call_not_found");
    }

    // Given a direct call under way,
    // when the Popkin wraps up,
    // then its two members receive CallEnded with the thread, and no direct call is under way (L2-045 AC1).
    [Fact]
    public async Task A_wrap_up_ends_the_direct_call()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);
        var callId = (await cast.Walt.OnDirectCallAsync(cast.PopkinId, cast.ThreadId)).CallId();

        await cast.Mara.WrappedUpAsync(cast.PopkinId);

        var ended = await cast.MaraHub.WaitForAsync("CallEnded");
        Assert.Equal(callId, ended.Arguments[1].GetGuid());
        Assert.Equal(cast.ThreadId, ended.Arguments[2].GetGuid());
        await cast.WaltHub.WaitForAsync("CallEnded");
        Assert.Equal(System.Net.HttpStatusCode.NoContent, (await cast.Walt.CurrentDirectCallAsync(cast.PopkinId, cast.ThreadId)).StatusCode);
        await cast.RuthHub.WaitForAsync("PopkinWrappedUp");
        Assert.Empty(cast.RuthHub.ReceivedNamed("CallEnded"));
    }
}
