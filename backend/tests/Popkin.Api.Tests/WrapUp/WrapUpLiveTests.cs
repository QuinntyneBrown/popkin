using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// What a wrap-up does beside the Popkin itself: it ends the call under way and tells every
/// member with the Popkin open, as `CallEnded` and then `PopkinWrappedUp` (L2-044 AC4, L2-045 AC1).
/// </summary>
public sealed class WrapUpLiveTests
{
    // Given two members with Popkin open and both on its group call,
    // when the Host wraps the Popkin up,
    // then the call has ended with nobody on it, and each hears CallEnded and then PopkinWrappedUp.
    [Fact]
    public async Task A_wrap_up_ends_the_call_under_way_and_tells_the_members()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await joel.OnCallAsync(lakeside.Id);

        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        foreach (var hub in new[] { maraHub, joelHub })
        {
            var wrappedUp = await hub.WaitForAsync("PopkinWrappedUp");
            Assert.Equal(lakeside.Id, wrappedUp.Arguments[0].GetGuid());
            var ended = Assert.Single(hub.ReceivedNamed("CallEnded"));
            Assert.Equal(lakeside.Id, ended.Arguments[0].GetGuid());
            Assert.Equal(callId, ended.Arguments[1].GetGuid());
            var names = hub.Received.Select(e => e.Name).ToList();
            Assert.True(names.IndexOf("CallEnded") < names.IndexOf("PopkinWrappedUp"), string.Join(", ", names));
        }

        Assert.Equal(HttpStatusCode.NoContent, (await joel.CurrentCallAsync(lakeside.Id)).StatusCode);
        // Nobody is left on it, so leaving it now finds no call.
        await (await joel.LeaveCallAsync(lakeside.Id, callId)).AssertProblem(HttpStatusCode.NotFound, "call_not_found");
    }

    // Given a signed-in person with Popkin open who is not a member of Lakeside,
    // when Lakeside wraps up and then their own Popkin does,
    // then they hear of their own Popkin's wrap-up only (L2-051).
    [Fact]
    public async Task A_person_who_is_not_a_member_hears_nothing_of_a_wrap_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await using var samHub = await api.CreateHubConnectionAsync(sam);

        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        await sam.WrappedUpAsync(bookClubId);

        await samHub.WaitForAsync("PopkinWrappedUp");
        Assert.Equal([bookClubId], samHub.ReceivedNamed("PopkinWrappedUp").Select(e => e.Arguments[0].GetGuid()));
    }

    // Given the Popkin's time runs out in the moment its Host wraps it up,
    // when the Host's wrap-up loses to it, then 409 popkin_wrapped_up, and the first wrap-up stands.
    [Fact]
    public async Task A_wrap_up_that_loses_to_another_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Faults.LoseNextSaveTo = () => api.WrapUpAsync(lakeside.Id, keepPhotos: true);

        var response = await lakeside.Host.WrapUpAsync(lakeside.Id, new { keepPhotos = false });

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.True(api.StoredPopkin(lakeside.Id).KeepPhotos);
    }
}
