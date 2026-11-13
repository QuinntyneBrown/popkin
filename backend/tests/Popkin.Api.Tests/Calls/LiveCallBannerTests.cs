using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>The `CallChanged` and `CallEnded` events of `PopkinHub`, which keep the call banner current (L2-029 AC2, AC6, L2-051).</summary>
public sealed class LiveCallBannerTests
{
    // Given two members with Popkin open,
    // when one starts the call, the other joins, one leaves and then the other,
    // then each change of the count reaches both as CallChanged with the Popkin, the call, a
    // version that rises and the whole count; and the end reaches both as CallEnded.
    [Fact]
    public async Task The_members_with_Popkin_open_follow_the_call_from_its_start_to_its_end()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var callId = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        var started = await joelHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 1);
        Assert.Equal(lakeside.Id, started.Arguments[0].GetGuid());
        Assert.Equal(callId, started.Arguments[1].GetGuid());
        Assert.Equal(1, started.Arguments[3].GetInt32());

        await joel.OnCallAsync(lakeside.Id);
        var two = await maraHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 2);
        Assert.Equal(2, two.Arguments[3].GetInt32());

        // A repeat of a join changes nothing, so it is announced to nobody.
        await joel.OnCallAsync(lakeside.Id);
        await lakeside.Host.LeaveCallAsync(lakeside.Id, callId);
        var one = await joelHub.WaitForAsync("CallChanged", e => e.Arguments[2].GetInt64() == 3);
        Assert.Equal(1, one.Arguments[3].GetInt32());

        await joel.LeaveCallAsync(lakeside.Id, callId);
        var ended = await maraHub.WaitForAsync("CallEnded");
        Assert.Equal(lakeside.Id, ended.Arguments[0].GetGuid());
        Assert.Equal(callId, ended.Arguments[1].GetGuid());
        await joelHub.WaitForAsync("CallEnded");
        // The end is said once, as CallEnded: no CallChanged carries a count of nobody.
        Assert.Equal([1L, 2L, 3L], maraHub.ReceivedNamed("CallChanged").Select(e => e.Arguments[2].GetInt64()));
        Assert.Equal([1L, 2L, 3L], joelHub.ReceivedNamed("CallChanged").Select(e => e.Arguments[2].GetInt64()));
        Assert.Single(joelHub.ReceivedNamed("CallEnded"));
    }

    // Given a signed-in person with Popkin open who is not a member of Lakeside,
    // when a call starts and ends in Lakeside and then one starts in their own Popkin,
    // then they hear of their own Popkin's call and nothing of Lakeside's (L2-051).
    [Fact]
    public async Task A_person_who_is_not_a_member_hears_nothing_of_a_Popkins_call()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await using var samHub = await api.CreateHubConnectionAsync(sam);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var lakesideCall = (await lakeside.Host.OnCallAsync(lakeside.Id)).CallId();
        await lakeside.Host.LeaveCallAsync(lakeside.Id, lakesideCall);
        await maraHub.WaitForAsync("CallEnded");
        await sam.OnCallAsync(bookClubId);

        await samHub.WaitForAsync("CallChanged");
        Assert.Equal([bookClubId], samHub.ReceivedNamed("CallChanged").Select(e => e.Arguments[0].GetGuid()));
        Assert.Empty(samHub.ReceivedNamed("CallEnded"));
        Assert.Equal([lakeside.Id], maraHub.ReceivedNamed("CallChanged").Select(e => e.Arguments[0].GetGuid()));
    }
}
