using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>
/// The direct call of a direct message: only its two members start it, join it and read it, and
/// it runs alongside the Popkin's group call (L2-030 AC8, L2-023 AC2, L2-045 AC1, L2-051).
/// </summary>
public sealed class DirectCallTests
{
    /// <summary>Mara, Walt and Ruth in Lakeside, with the direct message between Mara and Walt.</summary>
    private sealed record Cast(Guid PopkinId, Guid ThreadId, HttpClient Mara, HttpClient Walt, HttpClient Ruth);

    private static async Task<Cast> MaraAndWaltAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var threadId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        return new Cast(lakeside.Id, threadId, lakeside.Host, walt, ruth);
    }

    // Given the direct message between two members,
    // when one starts its call and the other joins it,
    // then 201 then 200 answer the one call, which names the thread, with both on it; the call
    // of the thread reads it, and the Popkin's group call reads none.
    [Fact]
    public async Task One_of_the_two_starts_the_direct_call_and_the_other_joins_it()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);

        var started = await cast.Mara.StartOrJoinDirectCallAsync(cast.PopkinId, cast.ThreadId);
        var joined = await cast.Walt.StartOrJoinDirectCallAsync(cast.PopkinId, cast.ThreadId);

        Assert.Equal(HttpStatusCode.Created, started.StatusCode);
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);
        var maras = await started.Content.ReadFromJsonAsync<JsonElement>();
        var walts = await joined.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(cast.ThreadId, maras.GetProperty("call").GetProperty("threadId").GetGuid());
        Assert.Equal(maras.CallId(), walts.CallId());
        Assert.Equal(["Mara Okafor", "Walt"], walts.ParticipantNames());
        var current = await cast.Mara.CurrentDirectCallAsync(cast.PopkinId, cast.ThreadId);
        Assert.Equal(HttpStatusCode.OK, current.StatusCode);
        var call = await current.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(maras.CallId(), call.GetProperty("id").GetGuid());
        Assert.Equal(cast.ThreadId, call.GetProperty("threadId").GetGuid());
        Assert.Equal(2, call.GetProperty("participantCount").GetInt32());
        Assert.Equal(HttpStatusCode.NoContent, (await cast.Ruth.CurrentCallAsync(cast.PopkinId)).StatusCode);
    }

    // Given a group call under way in a Popkin,
    // when two of its members start their direct call, and one of them joins the group call too,
    // then the two calls run at once, each with its own participants, and the group call names
    // no thread; the call of Everyone is the group call.
    [Fact]
    public async Task A_direct_call_and_the_group_call_run_at_once()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        var group = await cast.Ruth.OnCallAsync(cast.PopkinId);

        var direct = await cast.Mara.OnDirectCallAsync(cast.PopkinId, cast.ThreadId);
        var both = await cast.Mara.OnCallAsync(cast.PopkinId);

        Assert.NotEqual(group.CallId(), direct.CallId());
        Assert.Equal(group.CallId(), both.CallId());
        Assert.Equal(JsonValueKind.Null, group.GetProperty("call").GetProperty("threadId").ValueKind);
        Assert.Equal(["Ruth", "Mara Okafor"], both.ParticipantNames());
        Assert.Equal(["Mara Okafor"], direct.ParticipantNames());
        var viaEveryone = await cast.Walt.OnDirectCallAsync(cast.PopkinId, await cast.Walt.EveryoneThreadIdAsync(cast.PopkinId));
        Assert.Equal(group.CallId(), viaEveryone.CallId());
        var current = await (await cast.Walt.CurrentCallAsync(cast.PopkinId)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(group.CallId(), current.GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.NoContent, (await cast.Walt.CurrentDirectCallAsync(cast.PopkinId, await cast.Walt.DirectThreadIdAsync(
            cast.PopkinId, await cast.Ruth.MembershipIdAsync(cast.PopkinId)))).StatusCode);
    }

    // Given a direct call between two members,
    // when a third member of the Popkin starts or joins it, reads it, leaves it or sets their
    // microphone on it,
    // then the thread is 404 thread_not_found, as for a thread that does not exist, and the
    // call is 404 call_not_found; nobody is added to it. A person who is not a member gets
    // 404 popkin_not_found.
    [Fact]
    public async Task Nobody_else_joins_or_reads_a_direct_call()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        var callId = (await cast.Mara.OnDirectCallAsync(cast.PopkinId, cast.ThreadId)).CallId();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        foreach (var threadId in new[] { cast.ThreadId, Guid.NewGuid() })
        {
            await (await cast.Ruth.StartOrJoinDirectCallAsync(cast.PopkinId, threadId)).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await cast.Ruth.CurrentDirectCallAsync(cast.PopkinId, threadId)).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await stranger.StartOrJoinDirectCallAsync(cast.PopkinId, threadId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        }

        await (await cast.Ruth.LeaveCallAsync(cast.PopkinId, callId)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await cast.Ruth.SetCallMediaAsync(cast.PopkinId, callId, new { micOn = false })).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        var call = await (await cast.Walt.CurrentDirectCallAsync(cast.PopkinId, cast.ThreadId)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, call.GetProperty("participantCount").GetInt32());
    }

    // Given a Popkin that has wrapped up, when one of the two starts their direct call,
    // then 409 popkin_wrapped_up and no call is under way (L2-045 AC1).
    [Fact]
    public async Task No_direct_call_starts_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        await api.WrapUpAsync(cast.PopkinId);

        await (await cast.Walt.StartOrJoinDirectCallAsync(cast.PopkinId, cast.ThreadId)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");

        Assert.Equal(HttpStatusCode.NoContent, (await cast.Mara.CurrentDirectCallAsync(cast.PopkinId, cast.ThreadId)).StatusCode);
    }
}
