using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// The chat endpoints on a direct message: its two members read it and post to it as they do
/// in Everyone, and nobody else learns that it exists (L2-023 AC2, AC3, AC5, L2-051 AC1).
/// </summary>
public sealed class DirectMessageTests
{
    /// <summary>Mara, Walt and Ruth in Lakeside, with the direct message between Mara and Walt.</summary>
    private sealed record Cast(Guid PopkinId, Guid ThreadId, HttpClient Mara, Guid MaraId, HttpClient Walt, Guid WaltId, HttpClient Ruth);

    private static async Task<Cast> MaraAndWaltAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt Brennan");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        var threadId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, waltId);
        return new Cast(lakeside.Id, threadId, lakeside.Host, await lakeside.Host.MembershipIdAsync(lakeside.Id), walt, waltId, ruth);
    }

    // Given the direct message between two members,
    // when one posts and the other reads the thread,
    // then the message is stored as in Everyone, the other finds it unread, and marking it
    // read brings their count back to zero.
    [Fact]
    public async Task Its_two_members_post_read_and_mark_it_read_as_in_Everyone()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);

        var response = await cast.Mara.SendMessageAsync(cast.PopkinId, cast.ThreadId, " Did you pack the stove? ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sent = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(cast.ThreadId, sent.GetProperty("threadId").GetGuid());
        Assert.Equal("Did you pack the stove?", sent.GetProperty("text").GetString());
        Assert.Equal(cast.MaraId, sent.GetProperty("author").GetProperty("membershipId").GetGuid());
        var page = await cast.Walt.MessagesAsync(cast.PopkinId, cast.ThreadId);
        Assert.Equal(["Did you pack the stove?"], page.Texts());
        Assert.Equal(1, (await cast.Walt.DirectThreadAsync(cast.PopkinId, cast.MaraId)).GetProperty("unreadCount").GetInt32());
        Assert.Equal(0, (await cast.Mara.DirectThreadAsync(cast.PopkinId, cast.WaltId)).GetProperty("unreadCount").GetInt32());

        var read = await cast.Walt.PutAsJsonAsync(
            $"/api/popkins/{cast.PopkinId}/threads/{cast.ThreadId}/read", new { lastReadMessageId = sent.GetProperty("id").GetGuid() });

        Assert.Equal(HttpStatusCode.NoContent, read.StatusCode);
        var waltsThread = await cast.Walt.DirectThreadAsync(cast.PopkinId, cast.MaraId);
        Assert.Equal(0, waltsThread.GetProperty("unreadCount").GetInt32());
        Assert.Equal(sent.GetProperty("id").GetGuid(), waltsThread.GetProperty("lastReadMessageId").GetGuid());
        // Nothing of it is in Everyone, which has the notes of who popped in only.
        var everyone = await cast.Ruth.MessagesAsync(cast.PopkinId, await cast.Ruth.EveryoneThreadIdAsync(cast.PopkinId));
        Assert.DoesNotContain("Did you pack the stove?", everyone.Texts());
    }

    // Given a message whose send failed on the author's device,
    // when its author deletes it by its client message id,
    // then it is gone from the direct message for both.
    [Fact]
    public async Task Its_author_discards_a_message_of_a_direct_message()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        var clientMessageId = Guid.NewGuid();
        await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Wrong chat", clientMessageId);

        var discarded = await cast.Mara.DeleteAsync($"/api/popkins/{cast.PopkinId}/threads/{cast.ThreadId}/messages/client/{clientMessageId}");

        Assert.Equal(HttpStatusCode.NoContent, discarded.StatusCode);
        Assert.Empty((await cast.Walt.MessagesAsync(cast.PopkinId, cast.ThreadId)).Texts());
    }

    // Given a direct message between two members,
    // when a third member of the same Popkin names it to read it, post to it, delete from it or
    // mark it read, then each answers 404 thread_not_found, exactly as for a thread that does
    // not exist, and nothing is stored (L2-023 AC2). A person who is not a member of the Popkin
    // gets 404 popkin_not_found, as for every thread of it.
    [Fact]
    public async Task Nobody_else_reads_or_posts_to_a_direct_message()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        var sent = await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "Between us");
        var clientMessageId = sent.GetProperty("clientMessageId").GetGuid();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var stored = api.MessageCount();

        foreach (var threadId in new[] { cast.ThreadId, Guid.NewGuid() })
        {
            var messages = $"/api/popkins/{cast.PopkinId}/threads/{threadId}/messages";
            await (await cast.Ruth.GetAsync(messages)).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await cast.Ruth.GetAsync($"{messages}?before={sent.GetProperty("id").GetGuid()}")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await cast.Ruth.SendMessageAsync(cast.PopkinId, threadId, "Let me in")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await cast.Ruth.DeleteAsync($"{messages}/client/{clientMessageId}")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await cast.Ruth.PutAsJsonAsync(
                $"/api/popkins/{cast.PopkinId}/threads/{threadId}/read", new { lastReadMessageId = sent.GetProperty("id").GetGuid() }))
                .AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
            await (await stranger.GetAsync(messages)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
            await (await stranger.SendMessageAsync(cast.PopkinId, threadId, "Let me in")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        }

        Assert.Equal(stored, api.MessageCount());
        Assert.Equal(["Between us"], (await cast.Walt.MessagesAsync(cast.PopkinId, cast.ThreadId)).Texts());
    }

    // Given a direct message of a Popkin that has wrapped up,
    // when one of its two posts, then 409 popkin_wrapped_up and nothing is stored;
    // and both still read what was written (L2-023 AC5, L2-045).
    [Fact]
    public async Task A_direct_message_of_a_wrapped_up_Popkin_is_read_and_not_posted_to()
    {
        using var api = new ApiFactory();
        var cast = await MaraAndWaltAsync(api);
        await cast.Mara.SentMessageAsync(cast.PopkinId, cast.ThreadId, "See you next year");
        await api.WrapUpAsync(cast.PopkinId);

        var refused = await cast.Walt.SendMessageAsync(cast.PopkinId, cast.ThreadId, "Wait");

        await refused.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(["See you next year"], (await cast.Walt.MessagesAsync(cast.PopkinId, cast.ThreadId)).Texts());
    }
}
