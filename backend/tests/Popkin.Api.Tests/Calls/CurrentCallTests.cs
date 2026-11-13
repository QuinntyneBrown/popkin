using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>GET /api/popkins/{popkinId}/calls/current, the read behind the call banner (L2-029 AC2).</summary>
public sealed class CurrentCallTests
{
    // Given a Popkin with no call under way, when a member reads the current call, then 204.
    [Fact]
    public async Task There_is_no_current_call_until_one_starts()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/calls/current");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // Given a group call with two on it,
    // when a member who is not on it reads the current call,
    // then 200 answers the call with its start, its version and the count of two, and nothing else.
    [Fact]
    public async Task A_member_reads_the_call_under_way_and_how_many_are_on_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        await lakeside.Host.OnCallAsync(lakeside.Id);
        var joined = await joel.OnCallAsync(lakeside.Id);

        var response = await ruth.GetAsync($"/api/popkins/{lakeside.Id}/calls/current");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var call = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["id", "participantCount", "startedAt", "threadId", "version"], call.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(joined.GetProperty("call").GetRawText(), call.GetRawText());
        Assert.Equal(2, call.GetProperty("participantCount").GetInt32());
    }

    // The current call belongs to the Popkin's members: anyone else gets 404 popkin_not_found,
    // whether a call is under way or not, and a request without a session 401 (L2-050, L2-051).
    [Fact]
    public async Task Only_a_member_reads_the_current_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/calls/current")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await lakeside.Host.OnCallAsync(lakeside.Id);
        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/calls/current")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/calls/current")).StatusCode);
    }
}
