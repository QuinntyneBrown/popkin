using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// DELETE /api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}: a member deletes
/// their own message from "Message actions" (L2-024, L2-045 AC2).
/// </summary>
public sealed class DeleteMessageTests
{
    // Given a message of Mara's in Everyone with Joel's heart on it, and Joel with Popkin open,
    // when Mara deletes it,
    // then 204, Joel receives MessageDeleted, the message is gone from the thread, its text is
    // not kept and its reactions are removed; and deleting it again, or reacting to it, is 404
    // message_not_found.
    [Fact]
    public async Task The_author_deletes_their_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Wrong chat, sorry")).Id();
        await joel.ReactedAsync(lakeside.Id, threadId, message, "😂");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var response = await lakeside.Host.DeleteMessageAsync(lakeside.Id, threadId, message);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var deleted = await joelHub.WaitForAsync("MessageDeleted");
        Assert.Equal(threadId, deleted.Arguments[0].GetGuid());
        Assert.Equal(message, deleted.Arguments[1].GetGuid());
        Assert.DoesNotContain(message, (await joel.MessagesAsync(lakeside.Id, threadId)).Ids());
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal("", db.Messages.Single(m => m.Id == message).Text);
            Assert.False(db.MessageReactions.Any(r => r.MessageId == message));
        }

        await (await lakeside.Host.DeleteMessageAsync(lakeside.Id, threadId, message)).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
        await (await joel.ReactAsync(lakeside.Id, threadId, message, "❤️")).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
    }

    // Given a message of Mara's, when Joel deletes it, then 403 not_message_author and it stays.
    [Fact]
    public async Task Only_the_author_deletes_a_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();

        var response = await joel.DeleteMessageAsync(lakeside.Id, threadId, message);

        await response.AssertProblem(HttpStatusCode.Forbidden, "not_message_author");
        Assert.Contains(message, (await joel.MessagesAsync(lakeside.Id, threadId)).Ids());
    }

    // Given a message of the direct message between Mara and Walt, and Ruth with Popkin open,
    // when Mara deletes it,
    // then Walt receives MessageDeleted; and Ruth, who then receives the deletion of a message
    // of Everyone, received none before it.
    [Fact]
    public async Task The_deletion_of_a_direct_message_is_told_to_its_two_members_alone()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var walt = await api.JoinedAsync(lakeside.Code, "Walt", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var direct = (await lakeside.Host.SentMessageAsync(lakeside.Id, directId, "Only for you, Walt")).Id();
        var shared = (await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "Typo")).Id();
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        await using var ruthHub = await api.CreateHubConnectionAsync(ruth);

        await lakeside.Host.DeleteMessageAsync(lakeside.Id, directId, direct);
        await lakeside.Host.DeleteMessageAsync(lakeside.Id, everyoneId, shared);

        await waltHub.WaitForAsync("MessageDeleted", e => e.Arguments[1].GetGuid() == direct);
        await ruthHub.WaitForAsync("MessageDeleted");
        Assert.Equal(shared, Assert.Single(ruthHub.ReceivedNamed("MessageDeleted")).Arguments[1].GetGuid());
    }

    // Given a wrapped-up Popkin, when the author deletes their message, then 409
    // popkin_wrapped_up and it stays (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_deleted_from_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "See you all next year")).Id();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.DeleteMessageAsync(lakeside.Id, threadId, message);

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Contains(message, (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Ids());
    }
}
