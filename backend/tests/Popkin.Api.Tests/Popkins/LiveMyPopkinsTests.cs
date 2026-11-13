using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>What lets My Popkins raise a badge while it is open: `MessageAdded` for every Popkin of the member (L2-027 AC3, L2-017 AC2).</summary>
public sealed class LiveMyPopkinsTests
{
    // Given Joel, a member of Lakeside Weekend and of Book Club, connected to the hub and having
    // opened neither Popkin, nor any thread, since he joined,
    // when a message is written in each,
    // then his connection receives MessageAdded for both, each naming the Everyone thread that
    // its card of My Popkins carries, and each card then counts that message as unread.
    [Fact]
    public async Task A_member_on_My_Popkins_is_told_of_a_message_in_each_of_their_Popkins()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClub = await created.Content.ReadFromJsonAsync<JsonElement>();
        var bookClubId = bookClub.GetProperty("id").GetGuid();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        await joel.JoinAsync(bookClub.GetProperty("inviteCode").GetString()!, "Joel");
        var lakesideThreadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var bookClubThreadId = await sam.EveryoneThreadIdAsync(bookClubId);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        api.Clock.Advance(TimeSpan.FromSeconds(1));

        await lakeside.Host.SentMessageAsync(lakeside.Id, lakesideThreadId, "Boats at ten");
        await sam.SentMessageAsync(bookClubId, bookClubThreadId, "Chapter four tonight");

        var fromLakeside = await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("text").GetString() == "Boats at ten");
        var fromBookClub = await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("text").GetString() == "Chapter four tonight");
        var mine = await joel.GetFromJsonAsync<JsonElement>("/api/popkins");
        JsonElement Card(Guid popkinId) =>
            mine.GetProperty("active").EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == popkinId);
        Assert.Equal(Card(lakeside.Id).GetProperty("everyoneThreadId").GetGuid(), fromLakeside.Arguments[0].GetProperty("threadId").GetGuid());
        Assert.Equal(Card(bookClubId).GetProperty("everyoneThreadId").GetGuid(), fromBookClub.Arguments[0].GetProperty("threadId").GetGuid());
        // The event's author is not Joel's membership of that Popkin, which is how a client knows the message is unread.
        Assert.NotEqual(Card(lakeside.Id).GetProperty("viewerMembershipId").GetGuid(), fromLakeside.Arguments[0].GetProperty("author").GetProperty("membershipId").GetGuid());
        Assert.Equal(1, Card(lakeside.Id).GetProperty("unreadCount").GetInt32());
        Assert.Equal(1, Card(bookClubId).GetProperty("unreadCount").GetInt32());
    }
}
