using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>The unread count and PUT /api/popkins/{popkinId}/threads/{threadId}/read (L2-027 AC3, AC4).</summary>
public sealed class ReadPointTests
{
    private static Task<HttpResponseMessage> MarkReadAsync(HttpClient member, Guid popkinId, Guid threadId, Guid? lastReadMessageId) =>
        member.PutAsJsonAsync($"/api/popkins/{popkinId}/threads/{threadId}/read", new { lastReadMessageId });

    private sealed record Cast(StartedPopkin Lakeside, Guid ThreadId, HttpClient Joel);

    private static async Task<Cast> LakesideWithJoelAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        return new Cast(lakeside, await joel.EveryoneThreadIdAsync(lakeside.Id), joel);
    }

    // Given messages by another member and by the reader, a second apart,
    // when the reader opens the thread header before reading anything,
    // then the unread count is the other member's messages only and there is no read point.
    [Fact]
    public async Task Unread_counts_the_messages_of_others_only()
    {
        using var api = new ApiFactory();
        var (lakeside, threadId, joel) = await LakesideWithJoelAsync(api);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "Morning!");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");

        var thread = await joel.EveryoneThreadAsync(lakeside.Id);

        Assert.Equal(2, thread.GetProperty("unreadCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, thread.GetProperty("lastReadMessageId").ValueKind);
    }

    // Given two unread messages,
    // when the reader marks the first read, then one is unread;
    // when they mark the latest read, then none is, and the read point is that message;
    // when an older message is marked afterwards, then the read point does not move back.
    [Fact]
    public async Task Marking_read_moves_the_read_point_forward_and_never_back()
    {
        using var api = new ApiFactory();
        var (lakeside, threadId, joel) = await LakesideWithJoelAsync(api);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var first = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var second = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");

        var marked = await MarkReadAsync(joel, lakeside.Id, threadId, first.GetProperty("id").GetGuid());
        var afterFirst = await joel.EveryoneThreadAsync(lakeside.Id);
        await MarkReadAsync(joel, lakeside.Id, threadId, second.GetProperty("id").GetGuid());
        var afterSecond = await joel.EveryoneThreadAsync(lakeside.Id);
        var back = await MarkReadAsync(joel, lakeside.Id, threadId, first.GetProperty("id").GetGuid());
        var afterBack = await joel.EveryoneThreadAsync(lakeside.Id);

        Assert.Equal(HttpStatusCode.NoContent, marked.StatusCode);
        Assert.Equal(1, afterFirst.GetProperty("unreadCount").GetInt32());
        Assert.Equal(first.GetProperty("id").GetGuid(), afterFirst.GetProperty("lastReadMessageId").GetGuid());
        Assert.Equal(0, afterSecond.GetProperty("unreadCount").GetInt32());
        Assert.Equal(second.GetProperty("id").GetGuid(), afterSecond.GetProperty("lastReadMessageId").GetGuid());
        Assert.Equal(HttpStatusCode.NoContent, back.StatusCode);
        Assert.Equal(0, afterBack.GetProperty("unreadCount").GetInt32());
        Assert.Equal(second.GetProperty("id").GetGuid(), afterBack.GetProperty("lastReadMessageId").GetGuid());
        // A read point is the reader's own: the author's count is untouched by it.
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "On my way");
        Assert.Equal(0, (await joel.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
    }

    // Given a reader with two connections open and another member with one,
    // when the reader marks the thread read on one device,
    // then ThreadRead reaches the reader's connections and nobody else's,
    // and marking an older message afterwards sends nothing.
    [Fact]
    public async Task ThreadRead_reaches_every_connection_of_the_reader_and_nobody_else()
    {
        using var api = new ApiFactory();
        var (lakeside, threadId, joel) = await LakesideWithJoelAsync(api);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var first = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var second = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");
        await using var phone = await api.CreateHubConnectionAsync(joel);
        await using var laptop = await api.CreateHubConnectionAsync(joel);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        await MarkReadAsync(joel, lakeside.Id, threadId, second.GetProperty("id").GetGuid());
        await MarkReadAsync(joel, lakeside.Id, threadId, first.GetProperty("id").GetGuid());
        var marker = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Anyone seen the kettle?");

        Assert.Equal(threadId, (await phone.WaitForAsync("ThreadRead")).Arguments[0].GetGuid());
        Assert.Equal(threadId, (await laptop.WaitForAsync("ThreadRead")).Arguments[0].GetGuid());
        // The message sent afterwards has arrived everywhere, so nothing else is still on its way.
        foreach (var hub in new[] { phone, laptop, maraHub })
        {
            await hub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == marker.GetProperty("id").GetGuid());
        }

        Assert.Single(phone.ReceivedNamed("ThreadRead"));
        Assert.Single(laptop.ReceivedNamed("ThreadRead"));
        Assert.Empty(maraHub.ReceivedNamed("ThreadRead"));
    }

    // A read point must be a message of the thread: anything else is 400 message_not_found.
    [Fact]
    public async Task A_read_point_must_be_a_message_of_the_thread()
    {
        using var api = new ApiFactory();
        var (lakeside, threadId, joel) = await LakesideWithJoelAsync(api);

        var unknown = await MarkReadAsync(joel, lakeside.Id, threadId, Guid.NewGuid());
        var missing = await MarkReadAsync(joel, lakeside.Id, threadId, null);

        Assert.Equal("lastReadMessageId", (await unknown.AssertProblem(HttpStatusCode.BadRequest, "message_not_found")).GetProperty("field").GetString());
        Assert.Equal("lastReadMessageId", (await missing.AssertProblem(HttpStatusCode.BadRequest, "message_not_found")).GetProperty("field").GetString());
    }

    // Only a member marks a thread of their Popkin read, and a wrapped-up Popkin can still be read.
    [Fact]
    public async Task Only_a_member_marks_read_and_a_wrapped_up_Popkin_still_can_be()
    {
        using var api = new ApiFactory();
        var (lakeside, threadId, joel) = await LakesideWithJoelAsync(api);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var message = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "See you all next year");
        var messageId = message.GetProperty("id").GetGuid();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await MarkReadAsync(stranger, lakeside.Id, threadId, messageId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await MarkReadAsync(joel, lakeside.Id, Guid.NewGuid(), messageId)).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await MarkReadAsync(api.CreateBrowserClient(), lakeside.Id, threadId, messageId)).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal(HttpStatusCode.NoContent, (await MarkReadAsync(joel, lakeside.Id, threadId, messageId)).StatusCode);
        Assert.Equal(0, (await joel.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
    }
}
