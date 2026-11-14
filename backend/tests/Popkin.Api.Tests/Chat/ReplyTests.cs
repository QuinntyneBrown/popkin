using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// POST /api/popkins/{popkinId}/threads/{threadId}/messages with `replyToMessageId`: a reply
/// carries a quote of the message it answers (L2-025).
/// </summary>
public sealed class ReplyTests
{
    private static Task<HttpResponseMessage> ReplyAsync(HttpClient member, Guid popkinId, Guid threadId, Guid replyToMessageId, string text) =>
        member.PostAsJsonAsync($"/api/popkins/{popkinId}/threads/{threadId}/messages", new { clientMessageId = Guid.NewGuid(), text, replyToMessageId });

    // Given Ruth's message of two lines in Everyone, and Mara with Popkin open,
    // when Joel replies to it,
    // then 201 with a quote of Ruth's first name and the first line of her message, and the
    // reply carries the same quote on MessageAdded and on the read of the thread;
    // and a message that replies to nothing has no quote.
    [Fact]
    public async Task A_reply_quotes_the_message_it_answers()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var asked = (await ruth.SentMessageAsync(lakeside.Id, threadId, "Can someone grab the paddles from the shed?\nThey're behind the kayaks.")).Id();
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var response = await ReplyAsync(joel, lakeside.Id, threadId, asked, "Put me down");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var reply = await response.Content.ReadFromJsonAsync<JsonElement>();
        var quote = reply.GetProperty("quote");
        Assert.Equal(asked, quote.GetProperty("messageId").GetGuid());
        Assert.Equal("Ruth", quote.GetProperty("authorFirstName").GetString());
        Assert.Equal("Can someone grab the paddles from the shed?", quote.GetProperty("snippet").GetString());
        Assert.False(quote.GetProperty("deleted").GetBoolean());
        var added = await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].Id() == reply.Id());
        Assert.Equal(reply.GetRawText(), added.Arguments[0].GetRawText());
        var items = (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(reply.GetRawText(), items.Single(m => m.Id() == reply.Id()).GetRawText());
        Assert.Equal(JsonValueKind.Null, items.Single(m => m.Id() == asked).GetProperty("quote").ValueKind);
    }

    // Given a reply to Ruth's message, when Ruth deletes hers,
    // then the reply keeps its link and its quote reads deleted, with no name and no snippet;
    // and a new reply to the deleted message is allowed and quoted the same (L2-025 AC4).
    [Fact]
    public async Task The_quote_of_a_deleted_message_reads_deleted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var asked = (await ruth.SentMessageAsync(lakeside.Id, threadId, "Can someone grab the paddles?")).Id();
        var reply = await (await ReplyAsync(lakeside.Host, lakeside.Id, threadId, asked, "Put me down")).Content.ReadFromJsonAsync<JsonElement>();
        (await ruth.DeleteMessageAsync(lakeside.Id, threadId, asked)).EnsureSuccessStatusCode();

        var late = await ReplyAsync(lakeside.Host, lakeside.Id, threadId, asked, "Too late?");

        Assert.Equal(HttpStatusCode.Created, late.StatusCode);
        var lateQuote = (await late.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("quote");
        var read = (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == reply.Id());
        foreach (var quote in new[] { read.GetProperty("quote"), lateQuote })
        {
            Assert.Equal(asked, quote.GetProperty("messageId").GetGuid());
            Assert.True(quote.GetProperty("deleted").GetBoolean());
            Assert.Equal(JsonValueKind.Null, quote.GetProperty("authorFirstName").ValueKind);
            Assert.Equal(JsonValueKind.Null, quote.GetProperty("snippet").ValueKind);
        }
    }

    // Given a message whose first line is longer than 120 characters, when a member replies to
    // it, then the snippet is its first 120 characters.
    [Fact]
    public async Task A_snippet_is_at_most_120_characters()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var line = string.Concat(Enumerable.Repeat("Paddles, ", 20));
        var asked = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, line)).Id();

        var reply = await (await ReplyAsync(lakeside.Host, lakeside.Id, threadId, asked, "Got them")).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(line[..120], reply.GetProperty("quote").GetProperty("snippet").GetString());
    }

    // Given a message of the direct message between Mara and Walt,
    // when Mara replies to it in Everyone, or to a message that does not exist,
    // then 400 reply_not_found names `replyToMessageId` and nothing is stored.
    [Fact]
    public async Task A_reply_answers_a_message_of_the_same_thread()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var walt = await api.JoinedAsync(lakeside.Code, "Walt", "(415) 555-0191");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var direct = (await lakeside.Host.SentMessageAsync(lakeside.Id, directId, "Only for you, Walt")).Id();
        var before = api.MessageCount();

        var elsewhere = await ReplyAsync(lakeside.Host, lakeside.Id, everyoneId, direct, "Wrong thread");
        var nowhere = await ReplyAsync(lakeside.Host, lakeside.Id, everyoneId, Guid.NewGuid(), "No such message");

        var problem = await elsewhere.AssertProblem(HttpStatusCode.BadRequest, "reply_not_found");
        Assert.Equal("replyToMessageId", problem.GetProperty("field").GetString());
        await nowhere.AssertProblem(HttpStatusCode.BadRequest, "reply_not_found");
        Assert.Equal(before, api.MessageCount());
    }
}
