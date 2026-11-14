using System.Net;
using System.Net.Http.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// Reacting, deleting and replying are a member's, in a thread they may read, on a message that
/// is there, in a Popkin that has not wrapped up (L2-045 AC2, L2-051).
/// </summary>
public sealed class MessageActionsAccessTests
{
    // Given a Popkin and a signed-in person who is not a member, or no session,
    // when they react, take a reaction away, delete a message or reply,
    // then 404 popkin_not_found, so the Popkin's existence is never disclosed, or 401.
    [Fact]
    public async Task Only_a_member_acts_on_a_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.ReactAsync(lakeside.Id, threadId, message, "❤️")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.UnreactAsync(lakeside.Id, threadId, message, "❤️")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.DeleteMessageAsync(lakeside.Id, threadId, message)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.PostAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages", new { clientMessageId = Guid.NewGuid(), text = "Hi", replyToMessageId = message }))
            .AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        var anonymous = api.CreateBrowserClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.ReactAsync(lakeside.Id, threadId, message, "❤️")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteMessageAsync(lakeside.Id, threadId, message)).StatusCode);
    }

    // Given the direct message between Mara and Walt, when Ruth reacts to one of its messages,
    // takes a reaction away or deletes one, then 404 thread_not_found: she cannot tell it is there.
    [Fact]
    public async Task Nobody_acts_on_the_direct_message_of_two_others()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.JoinedAsync(lakeside.Code, "Walt", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var direct = (await lakeside.Host.SentMessageAsync(lakeside.Id, directId, "Only for you, Walt")).Id();

        await (await ruth.ReactAsync(lakeside.Id, directId, direct, "❤️")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await (await ruth.UnreactAsync(lakeside.Id, directId, direct, "❤️")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await (await ruth.DeleteMessageAsync(lakeside.Id, directId, direct)).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
    }

    // Given a message of a direct message and the popped-in note of Everyone,
    // when a member reacts to the first through Everyone, or to the note, or deletes either,
    // then 404 message_not_found: a message is acted on in its own thread, and a system note has no actions.
    [Fact]
    public async Task A_message_is_acted_on_in_its_own_thread_and_a_note_not_at_all()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var walt = await api.JoinedAsync(lakeside.Code, "Walt", "(415) 555-0191");
        var directId = await walt.DirectThreadIdAsync(lakeside.Id, await lakeside.Host.MembershipIdAsync(lakeside.Id));
        var direct = (await walt.SentMessageAsync(lakeside.Id, directId, "Only for you, Mara")).Id();
        var note = (await walt.MessagesAsync(lakeside.Id, everyoneId)).GetProperty("items").EnumerateArray()
            .Single(m => m.GetProperty("kind").GetString() == "System").Id();

        await (await walt.ReactAsync(lakeside.Id, everyoneId, direct, "❤️")).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
        await (await walt.DeleteMessageAsync(lakeside.Id, everyoneId, direct)).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
        await (await lakeside.Host.ReactAsync(lakeside.Id, everyoneId, note, "👋")).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
        await (await walt.DeleteMessageAsync(lakeside.Id, everyoneId, note)).AssertProblem(HttpStatusCode.NotFound, "message_not_found");
    }

    // Given a message with a heart in a Popkin that has wrapped up,
    // when a member reacts, takes the heart away or replies,
    // then 409 popkin_wrapped_up and the reactions are as they were (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_reacted_to_or_replied_to_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "See you all next year")).Id();
        var before = await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "❤️");
        await api.WrapUpAsync(lakeside.Id);

        await (await lakeside.Host.ReactAsync(lakeside.Id, threadId, message, "🔥")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await lakeside.Host.UnreactAsync(lakeside.Id, threadId, message, "❤️")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await lakeside.Host.PostAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages", new { clientMessageId = Guid.NewGuid(), text = "One more", replyToMessageId = message }))
            .AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        var read = (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == message);
        Assert.Equal(before.GetProperty("reactions").GetRawText(), read.GetProperty("reactions").GetRawText());
        Assert.Equal(before.Version(), read.GetProperty("reactionsVersion").GetInt32());
    }
}
