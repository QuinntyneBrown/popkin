using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>POST /api/popkins/{popkinId}/calls/{callId}/leave (L2-029 AC6, L2-030 AC6).</summary>
public sealed class LeaveCallTests
{
    // Given a call with two on it,
    // when one leaves,
    // then 204, the call goes on with one on it at a higher version, and whoever joins next
    // finds only those who stayed.
    [Fact]
    public async Task A_member_leaves_and_the_call_goes_on_without_them()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await lakeside.Host.OnCallAsync(lakeside.Id);
        var joined = await joel.OnCallAsync(lakeside.Id);

        var response = await lakeside.Host.LeaveCallAsync(lakeside.Id, joined.CallId());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var call = await (await joel.CurrentCallAsync(lakeside.Id)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(joined.CallId(), call.GetProperty("id").GetGuid());
        Assert.Equal(1, call.GetProperty("participantCount").GetInt32());
        Assert.Equal(3, call.GetProperty("version").GetInt64());
        Assert.Equal(["Joel F"], (await joel.OnCallAsync(lakeside.Id)).ParticipantNames());
    }

    // Given a member alone on the call,
    // when they leave, then the call has ended: there is no current call, and the next to
    // post starts a new one (L2-029 AC6).
    [Fact]
    public async Task The_call_ends_when_the_last_person_leaves()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var first = await lakeside.Host.OnCallAsync(lakeside.Id);

        var response = await lakeside.Host.LeaveCallAsync(lakeside.Id, first.CallId());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.CurrentCallAsync(lakeside.Id)).StatusCode);
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        var next = await lakeside.Host.StartOrJoinCallAsync(lakeside.Id);
        Assert.Equal(HttpStatusCode.Created, next.StatusCode);
        var second = await next.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotEqual(first.CallId(), second.CallId());
        Assert.Equal(api.Clock.GetUtcNow(), second.GetProperty("call").GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(["Mara Okafor"], second.ParticipantNames());
    }

    // Given a member who left and came back,
    // when the participants are read, then they are on the call once, from when they came back.
    [Fact]
    public async Task A_member_who_comes_back_is_on_the_call_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        await joel.OnCallAsync(lakeside.Id);
        await lakeside.Host.LeaveCallAsync(lakeside.Id, started.CallId());
        api.Clock.Advance(TimeSpan.FromMinutes(1));

        var back = await lakeside.Host.OnCallAsync(lakeside.Id);

        Assert.Equal(started.CallId(), back.CallId());
        Assert.Equal(["Joel F", "Mara Okafor"], back.ParticipantNames());
        Assert.Equal(2, back.GetProperty("call").GetProperty("participantCount").GetInt32());
    }

    // Given a call, when someone who is not on it leaves it, then 404 call_not_found: a member
    // who never joined, one who has left already, a call that does not exist, and a call of
    // another Popkin. A person who is not a member gets 404 popkin_not_found (L2-051 AC1).
    [Fact]
    public async Task Only_someone_on_the_call_leaves_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        var created = await joel.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var bookClubCall = (await joel.OnCallAsync(bookClubId)).CallId();
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await joel.LeaveCallAsync(lakeside.Id, callId)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await lakeside.Host.LeaveCallAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await joel.LeaveCallAsync(lakeside.Id, bookClubCall)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        await (await stranger.LeaveCallAsync(lakeside.Id, callId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().LeaveCallAsync(lakeside.Id, callId)).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.LeaveCallAsync(lakeside.Id, callId)).StatusCode);
        await (await lakeside.Host.LeaveCallAsync(lakeside.Id, callId)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
        // Joel's own call was never touched.
        Assert.Equal(HttpStatusCode.OK, (await joel.CurrentCallAsync(bookClubId)).StatusCode);
    }

    // Given a call under way in a Popkin that then wraps up,
    // when a participant leaves, then they can: leaving adds nothing to the Popkin.
    [Fact]
    public async Task A_participant_can_leave_after_the_Popkin_has_wrapped_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.LeaveCallAsync(lakeside.Id, callId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await lakeside.Host.CurrentCallAsync(lakeside.Id)).StatusCode);
    }
}
