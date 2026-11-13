using System.Net.Http.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// The hub events of a direct message go to the connections of its two members and to nobody
/// else, never to the Popkin's group (L2-023 AC2, L2-027 AC1, L2-051).
/// </summary>
public sealed class LiveDirectMessagesTests
{
    /// <summary>Mara, Walt and Ruth in Lakeside with Popkin open, and the direct message between Mara and Walt.</summary>
    private sealed record Cast(
        Guid PopkinId, Guid ThreadId, Guid EveryoneId, HttpClient Mara, HubEvents MaraHub, HttpClient Walt, HubEvents WaltHub, HttpClient Ruth, HubEvents RuthHub)
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
            await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id),
            lakeside.Host,
            await api.CreateHubConnectionAsync(lakeside.Host),
            walt,
            await api.CreateHubConnectionAsync(walt),
            ruth,
            await api.CreateHubConnectionAsync(ruth));
    }

    private static List<string?> Texts(HubEvents hub) =>
        hub.ReceivedNamed("MessageAdded").Select(e => e.Arguments[0].GetProperty("text").GetString()).ToList();

    // Given three members with Popkin open, two of whom have a direct message,
    // when one of the two posts in it,
    // then the other's connection receives MessageAdded with the message as the sender was
    // answered, within 1 second, and so does the sender's own;
    // and the third member, who then receives a message of Everyone, received nothing before it.
    [Fact]
    public async Task A_direct_message_reaches_its_two_members_and_nobody_else()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);

        var sent = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Only for you, Walt");

        var received = await cast.WaltHub.WaitForAsync("MessageAdded", timeout: TimeSpan.FromSeconds(1));
        Assert.Equal(sent.GetRawText(), received.Arguments[0].GetRawText());
        await cast.MaraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == sent.GetProperty("id").GetGuid());
        // A message of Everyone sent afterwards has reached the third member, so nothing else is on its way to them.
        await cast.Mara.SentMessageAsync(cast.PopkinId, cast.EveryoneId, "Dinner at seven, everyone");
        await cast.RuthHub.WaitForAsync("MessageAdded");
        Assert.Equal(["Dinner at seven, everyone"], Texts(cast.RuthHub));
        await cast.WaltHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("text").GetString() == "Dinner at seven, everyone");
        Assert.Equal(["Only for you, Walt", "Dinner at seven, everyone"], Texts(cast.WaltHub));
    }

    // Given a message of a direct message,
    // when its author deletes it,
    // then both of its members receive MessageDeleted, and the third member, who then receives
    // the deletion of a message of Everyone, received none before it.
    [Fact]
    public async Task The_deletion_of_a_direct_message_reaches_its_two_members_and_nobody_else()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);
        var direct = Guid.NewGuid();
        var shared = Guid.NewGuid();
        var sent = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Wrong chat", direct);
        var inEveryone = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.EveryoneId, "Typo", shared);

        await cast.Mara.DeleteAsync($"/api/popkins/{cast.PopkinId}/threads/{cast.ThreadId}/messages/client/{direct}");
        await cast.Mara.DeleteAsync($"/api/popkins/{cast.PopkinId}/threads/{cast.EveryoneId}/messages/client/{shared}");

        var deleted = await cast.WaltHub.WaitForAsync("MessageDeleted");
        Assert.Equal(cast.ThreadId, deleted.Arguments[0].GetGuid());
        Assert.Equal(sent.GetProperty("id").GetGuid(), deleted.Arguments[1].GetGuid());
        await cast.MaraHub.WaitForAsync("MessageDeleted", e => e.Arguments[0].GetGuid() == cast.ThreadId);
        await cast.RuthHub.WaitForAsync("MessageDeleted");
        var ruths = Assert.Single(cast.RuthHub.ReceivedNamed("MessageDeleted"));
        Assert.Equal(inEveryone.GetProperty("id").GetGuid(), ruths.Arguments[1].GetGuid());
    }

    // Given a direct message with one unread message,
    // when the member who has it unread marks it read,
    // then ThreadRead reaches that person's connections only: not the other member's, nor the third's.
    [Fact]
    public async Task Reading_a_direct_message_is_told_to_the_reader_alone()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);
        var sent = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Read me");

        await cast.Walt.PutAsJsonAsync(
            $"/api/popkins/{cast.PopkinId}/threads/{cast.ThreadId}/read", new { lastReadMessageId = sent.GetProperty("id").GetGuid() });

        var read = await cast.WaltHub.WaitForAsync("ThreadRead");
        Assert.Equal(cast.ThreadId, read.Arguments[0].GetGuid());
        // A message of Everyone sent afterwards has reached the others, so nothing else is on its way to them.
        await cast.Walt.SentMessageAsync(cast.PopkinId, cast.EveryoneId, "Morning");
        await cast.MaraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("text").GetString() == "Morning");
        await cast.RuthHub.WaitForAsync("MessageAdded");
        Assert.Empty(cast.MaraHub.ReceivedNamed("ThreadRead"));
        Assert.Empty(cast.RuthHub.ReceivedNamed("ThreadRead"));
    }

    // Given a member of a direct message who has left the Popkin with a connection still open,
    // when the other posts in it,
    // then the one who left receives nothing of it: they can no longer read the thread (L2-051).
    [Fact]
    public async Task A_member_who_has_left_receives_nothing_of_their_direct_messages()
    {
        using var api = new ApiFactory();
        await using var cast = await WithPopkinOpenAsync(api);
        await api.LeaveAsync(cast.PopkinId, "Walt");

        var sent = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Are you still there?");

        await cast.MaraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == sent.GetProperty("id").GetGuid());
        // The connection Walt opened as a member is still sent the Popkin's own events until it
        // closes (leaving a Popkin is journey 16), so a message of Everyone sent afterwards
        // reaches it and shows that nothing else was on its way.
        await cast.Mara.SentMessageAsync(cast.PopkinId, cast.EveryoneId, "Walt has gone home");
        await cast.WaltHub.WaitForAsync("MessageAdded");
        Assert.Equal(["Walt has gone home"], Texts(cast.WaltHub));
    }
}
