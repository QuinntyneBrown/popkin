using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>GET /api/popkins/{popkinId}/threads, the Chat tab (L2-022, L2-051, L2-054 AC2).</summary>
public sealed class ThreadListTests
{
    private static Task<JsonElement> ThreadsAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads");

    private static Guid Id(JsonElement element, string name) => element.GetProperty(name).GetGuid();

    // Given a member of a Popkin with messages in Everyone and in two of their direct messages,
    // a direct message opened and never used, and a direct message of two other members,
    // when they open the Chat tab,
    // then Everyone comes with its latest message by a member and its unread count, and the two
    // direct messages that hold a message follow, the most recent first, each with the other
    // member by name and avatar, its latest message and its unread count; nothing else is
    // listed, and no contact detail is in the answer.
    [Fact]
    public async Task The_Chat_tab_lists_Everyone_then_the_direct_messages_most_recent_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = lakeside.Host;
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt Brennan");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth Lindqvist");
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var maraId = await mara.MembershipIdAsync(lakeside.Id);
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        var ruthId = await ruth.MembershipIdAsync(lakeside.Id);
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        var everyoneId = await mara.EveryoneThreadIdAsync(lakeside.Id);
        var withWalt = await mara.DirectThreadIdAsync(lakeside.Id, waltId);
        var withRuth = await mara.DirectThreadIdAsync(lakeside.Id, ruthId);
        await mara.DirectThreadIdAsync(lakeside.Id, joelId);
        var waltAndRuth = await walt.DirectThreadIdAsync(lakeside.Id, ruthId);

        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await walt.SentMessageAsync(lakeside.Id, withWalt, "Did you pack the stove?");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await mara.SentMessageAsync(lakeside.Id, withWalt, "Yes, and the kettle");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await ruth.SentMessageAsync(lakeside.Id, withRuth, "Swap shifts tomorrow?");
        api.Clock.Advance(TimeSpan.FromSeconds(10));
        await ruth.SentMessageAsync(lakeside.Id, withRuth, "I can do mornings");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await walt.SentMessageAsync(lakeside.Id, waltAndRuth, "Not for Mara");
        var latestOfEveryone = await joel.SentMessageAsync(lakeside.Id, everyoneId, "Firewood is in the shed");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        // Popkin's own note that someone popped in is not what a member wrote.
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        await sam.JoinAsync(lakeside.Code, "Sam");

        var threads = await ThreadsAsync(mara, lakeside.Id);

        Assert.Equal(["direct", "everyone", "viewerMembershipId"], threads.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(maraId, Id(threads, "viewerMembershipId"));
        var everyone = threads.GetProperty("everyone");
        Assert.Equal(["latest", "threadId", "unreadCount"], everyone.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(everyoneId, Id(everyone, "threadId"));
        var latest = everyone.GetProperty("latest");
        Assert.Equal(["firstName", "isMine", "sentAt", "text"], latest.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Joel", latest.GetProperty("firstName").GetString());
        Assert.Equal("Firewood is in the shed", latest.GetProperty("text").GetString());
        Assert.False(latest.GetProperty("isMine").GetBoolean());
        Assert.Equal(latestOfEveryone.GetProperty("sentAt").GetDateTimeOffset(), latest.GetProperty("sentAt").GetDateTimeOffset());
        // The notes of Walt, Ruth, Joel and Sam popping in, and Joel's message.
        Assert.Equal(5, everyone.GetProperty("unreadCount").GetInt32());

        var direct = threads.GetProperty("direct").EnumerateArray().ToList();
        Assert.Equal([withRuth, withWalt], direct.Select(d => Id(d, "threadId")));
        var ruths = direct[0];
        Assert.Equal(["latest", "other", "threadId", "unreadCount"], ruths.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["avatar", "displayName", "firstName", "membershipId"], ruths.GetProperty("other").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(ruthId, Id(ruths.GetProperty("other"), "membershipId"));
        Assert.Equal("Ruth Lindqvist", ruths.GetProperty("other").GetProperty("displayName").GetString());
        Assert.Equal("Ruth", ruths.GetProperty("other").GetProperty("firstName").GetString());
        Assert.Equal("RL", ruths.GetProperty("other").GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(["isMine", "sentAt", "text"], ruths.GetProperty("latest").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("I can do mornings", ruths.GetProperty("latest").GetProperty("text").GetString());
        Assert.False(ruths.GetProperty("latest").GetProperty("isMine").GetBoolean());
        Assert.Equal(2, ruths.GetProperty("unreadCount").GetInt32());
        var walts = direct[1];
        Assert.Equal(waltId, Id(walts.GetProperty("other"), "membershipId"));
        Assert.Equal("Yes, and the kettle", walts.GetProperty("latest").GetProperty("text").GetString());
        Assert.True(walts.GetProperty("latest").GetProperty("isMine").GetBoolean());
        Assert.Equal(1, walts.GetProperty("unreadCount").GetInt32());
        // Never a phone number or an email (L2-054 AC2), and nothing of Walt and Ruth's own.
        Assert.DoesNotContain("555", threads.GetRawText());
        Assert.DoesNotContain("Not for Mara", threads.GetRawText());
    }

    // Given a member who has read their direct message and whose Popkin's Everyone holds only
    // Popkin's own notes, when they open the Chat tab, then Everyone has no latest message,
    // and the direct message they read has nothing unread.
    [Fact]
    public async Task Everyone_has_no_latest_message_until_a_member_writes_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var threadId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        var sent = await walt.SentMessageAsync(lakeside.Id, threadId, "Hello");
        await lakeside.Host.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/threads/{threadId}/read", new { lastReadMessageId = sent.GetProperty("id").GetGuid() });

        var threads = await ThreadsAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(JsonValueKind.Null, threads.GetProperty("everyone").GetProperty("latest").ValueKind);
        Assert.Equal(1, threads.GetProperty("everyone").GetProperty("unreadCount").GetInt32());
        Assert.Equal(0, Assert.Single(threads.GetProperty("direct").EnumerateArray()).GetProperty("unreadCount").GetInt32());
    }

    // Given a direct message whose latest message its author deleted, and another whose other
    // member has left the Popkin,
    // when the member opens the Chat tab,
    // then the first shows the message before the deleted one, and the second is not listed:
    // a member who has left can no longer be messaged (L2-023 AC4).
    [Fact]
    public async Task A_deleted_message_is_never_the_latest_and_a_member_who_left_is_not_listed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var withWalt = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var withRuth = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await ruth.MembershipIdAsync(lakeside.Id));
        await walt.SentMessageAsync(lakeside.Id, withWalt, "First");
        api.Clock.Advance(TimeSpan.FromSeconds(10));
        var wrong = Guid.NewGuid();
        await walt.SentMessageAsync(lakeside.Id, withWalt, "Wrong chat", wrong);
        await walt.DeleteAsync($"/api/popkins/{lakeside.Id}/threads/{withWalt}/messages/client/{wrong}");
        await ruth.SentMessageAsync(lakeside.Id, withRuth, "Heading home");
        await api.LeaveAsync(lakeside.Id, "Ruth");

        var threads = await ThreadsAsync(lakeside.Host, lakeside.Id);

        var row = Assert.Single(threads.GetProperty("direct").EnumerateArray());
        Assert.Equal(withWalt, Id(row, "threadId"));
        Assert.Equal("First", row.GetProperty("latest").GetProperty("text").GetString());
        Assert.Equal(1, row.GetProperty("unreadCount").GetInt32());
    }

    // A person who is not a member of the Popkin gets 404 popkin_not_found, and no session 401 (L2-051).
    [Fact]
    public async Task Only_a_member_lists_a_Popkins_threads()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/threads")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/threads")).StatusCode);
    }
}
