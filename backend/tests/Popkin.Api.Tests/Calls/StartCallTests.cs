using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>POST /api/popkins/{popkinId}/calls when no group call is under way (L2-029 AC1, L2-045 AC1, L2-050, L2-051).</summary>
public sealed class StartCallTests
{
    // Given a member of an active Popkin with no call under way,
    // when they start the group call,
    // then 201 answers the call, started now with one on it, and the member as its only
    // participant, with the microphone and camera on, under the name they go by and no contact detail.
    [Fact]
    public async Task A_member_starts_the_group_call_and_is_on_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.StartOrJoinCallAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var joined = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["call", "iceServers", "participants", "viewerMembershipId"], joined.EnumerateObject().Select(p => p.Name).Order());
        var call = joined.GetProperty("call");
        Assert.Equal(["id", "participantCount", "startedAt", "version"], call.EnumerateObject().Select(p => p.Name).Order());
        Assert.NotEqual(Guid.Empty, call.GetProperty("id").GetGuid());
        Assert.Equal(api.Clock.GetUtcNow(), call.GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(1, call.GetProperty("version").GetInt64());
        Assert.Equal(1, call.GetProperty("participantCount").GetInt32());
        var mara = Assert.Single(joined.GetProperty("participants").EnumerateArray());
        Assert.Equal(
            ["avatar", "cameraOn", "firstName", "joinedAt", "mediaVersion", "membershipId", "micOn", "name"],
            mara.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(joined.ViewerMembershipId(), mara.GetProperty("membershipId").GetGuid());
        Assert.Equal(
            (await lakeside.Host.EveryoneThreadAsync(lakeside.Id)).GetProperty("viewer").GetProperty("membershipId").GetGuid(),
            joined.ViewerMembershipId());
        Assert.Equal("Mara", mara.GetProperty("firstName").GetString());
        Assert.Equal("Mara Okafor", mara.GetProperty("name").GetString());
        Assert.Equal("MO", mara.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.True(mara.GetProperty("micOn").GetBoolean());
        Assert.True(mara.GetProperty("cameraOn").GetBoolean());
        Assert.Equal(0, mara.GetProperty("mediaVersion").GetInt64());
        Assert.Equal(api.Clock.GetUtcNow(), mara.GetProperty("joinedAt").GetDateTimeOffset());
        // No relay is configured here: peers on one machine connect without one.
        Assert.Empty(joined.GetProperty("iceServers").EnumerateArray());
        // Never a phone number or an email (L2-054 AC2).
        Assert.DoesNotContain("555", joined.GetRawText());
    }

    // Given a member who arrives with the microphone or the camera off,
    // when they start the call, then they are on it that way.
    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task A_member_may_arrive_with_the_microphone_or_the_camera_off(bool micOn, bool cameraOn)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var joined = await lakeside.Host.OnCallAsync(lakeside.Id, new { micOn, cameraOn });

        var mara = joined.GetProperty("participants")[0];
        Assert.Equal(micOn, mara.GetProperty("micOn").GetBoolean());
        Assert.Equal(cameraOn, mara.GetProperty("cameraOn").GetBoolean());
    }

    // A call belongs to the Popkin's members: anyone else gets 404 popkin_not_found, and a
    // request without a session 401 (L2-050 AC1, L2-051 AC1). Neither starts a call.
    [Fact]
    public async Task Only_a_member_starts_a_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.StartOrJoinCallAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().StartOrJoinCallAsync(lakeside.Id)).StatusCode);

        // The Host's own start is still the first: 201.
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.StartOrJoinCallAsync(lakeside.Id)).StatusCode);
    }

    // Given a Popkin that has wrapped up, when a member starts a call, then 409 popkin_wrapped_up (L2-045 AC1).
    [Fact]
    public async Task No_call_starts_in_a_Popkin_that_has_wrapped_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        await (await lakeside.Host.StartOrJoinCallAsync(lakeside.Id)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }
}
