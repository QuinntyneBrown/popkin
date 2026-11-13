using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// DELETE /api/popkins/{popkinId}/threads/{threadId}/messages/client/{clientMessageId}: "Delete" on
/// a message that was not sent, safe whatever the server holds (L2-028 AC1, L2-045 AC2).
/// </summary>
public sealed class DiscardMessageTests
{
    private static Task<HttpResponseMessage> DiscardAsync(HttpClient member, Guid popkinId, Guid threadId, Guid clientMessageId) =>
        member.DeleteAsync($"/api/popkins/{popkinId}/threads/{threadId}/messages/client/{clientMessageId}");

    // Given a message the server stored though its answer was lost,
    // when its author deletes it by its client message id, twice,
    // then 204 both times, the message is gone from every read and from the unread count,
    // and the other members are told once, with MessageDeleted.
    [Fact]
    public async Task The_author_deletes_a_stored_message_by_its_client_message_id()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var kept = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var clientMessageId = Guid.NewGuid();
        var lost = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Sent by mistake", clientMessageId);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var last = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var first = await DiscardAsync(lakeside.Host, lakeside.Id, threadId, clientMessageId);
        var again = await DiscardAsync(lakeside.Host, lakeside.Id, threadId, clientMessageId);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var marker = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Anyone seen the kettle?");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        var deleted = await joelHub.WaitForAsync("MessageDeleted");
        Assert.Equal(threadId, deleted.Arguments[0].GetGuid());
        Assert.Equal(lost.GetProperty("id").GetGuid(), deleted.Arguments[1].GetGuid());
        await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == marker.GetProperty("id").GetGuid());
        Assert.Single(joelHub.ReceivedNamed("MessageDeleted"));
        Assert.DoesNotContain("Sent by mistake", (await joel.MessagesAsync(lakeside.Id, threadId)).Texts());
        var window = await joel.MessagesAsync(lakeside.Id, threadId, $"from={kept.GetProperty("id").GetGuid()}&to={last.GetProperty("id").GetGuid()}");
        Assert.Equal(["Morning all", "Coffee is on"], window.Texts());
        Assert.Equal(3, (await joel.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
    }

    // Given a message that never reached the server,
    // when its author deletes it by its client message id, then 204 and nothing changes or is sent.
    [Fact]
    public async Task Deleting_a_message_the_server_never_stored_changes_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        await using var hub = await api.CreateHubConnectionAsync(lakeside.Host);

        var response = await DiscardAsync(lakeside.Host, lakeside.Id, threadId, Guid.NewGuid());
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var marker = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await hub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == marker.GetProperty("id").GetGuid());
        Assert.Empty(hub.ReceivedNamed("MessageDeleted"));
        Assert.Equal(["Morning all", "Coffee is on"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a message by one member,
    // when another member names its client message id, then 204 and the message stays: a
    // client message id deletes its author's own message only.
    [Fact]
    public async Task A_member_deletes_only_their_own_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var clientMessageId = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Mara's message", clientMessageId);

        var response = await DiscardAsync(joel, lakeside.Id, threadId, clientMessageId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains("Mara's message", (await joel.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a wrapped-up Popkin, when a member deletes their message by its client message id,
    // then 204 and the message stays: nothing in a wrapped-up Popkin changes (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_deleted_from_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var clientMessageId = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "See you all next year", clientMessageId);
        await api.WrapUpAsync(lakeside.Id);

        var response = await DiscardAsync(lakeside.Host, lakeside.Id, threadId, clientMessageId);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["See you all next year"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Only a member deletes, and only in a thread of their Popkin (L2-051).
    [Fact]
    public async Task Only_a_member_deletes_in_a_thread_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await DiscardAsync(stranger, lakeside.Id, threadId, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await DiscardAsync(lakeside.Host, lakeside.Id, Guid.NewGuid(), Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await DiscardAsync(api.CreateBrowserClient(), lakeside.Id, threadId, Guid.NewGuid())).StatusCode);
    }
}
