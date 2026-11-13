using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>GET /api/popkins/{popkinId}/threads/everyone/preview, the Chat card of the Popkin home (L2-019 AC3, L2-051 AC1).</summary>
public sealed class EveryonePreviewTests
{
    private static Task<JsonElement> PreviewAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads/everyone/preview");

    private static List<string> Texts(JsonElement preview) =>
        preview.GetProperty("messages").EnumerateArray().Select(m => m.GetProperty("text").GetString()!).ToList();

    // Given an Everyone thread with five messages by members, a note that Joel popped in and a
    // deleted message,
    // when Joel reads the preview,
    // then it holds the latest four messages by members, oldest first, each with its author,
    // and the count of messages new to Joel is the thread's unread count.
    [Fact]
    public async Task The_preview_holds_the_latest_four_messages_by_members_oldest_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Who's bringing the kettle?");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var second = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira")).Content.ReadFromJsonAsync<JsonElement>();
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var third = await joel.SentMessageAsync(lakeside.Id, threadId, "Morning!");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Boats at ten");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var mistake = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Sent by mistake", mistake);
        await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages/client/{mistake}");

        var preview = await PreviewAsync(joel, lakeside.Id);
        var thread = await joel.EveryoneThreadAsync(lakeside.Id);

        Assert.Equal(threadId, preview.GetProperty("threadId").GetGuid());
        Assert.Equal(["Morning all", "Morning!", "Coffee is on", "Boats at ten"], Texts(preview));
        var messages = preview.GetProperty("messages");
        Assert.Equal(second.GetProperty("id").GetGuid(), messages[0].GetProperty("id").GetGuid());
        Assert.Equal(second.GetProperty("sentAt").GetDateTimeOffset(), messages[0].GetProperty("sentAt").GetDateTimeOffset());
        Assert.Equal("Mara", messages[0].GetProperty("author").GetProperty("firstName").GetString());
        Assert.Equal("MO", messages[0].GetProperty("author").GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(third.GetProperty("id").GetGuid(), messages[1].GetProperty("id").GetGuid());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), messages[1].GetProperty("author").GetProperty("membershipId").GetGuid());
        Assert.Equal(["author", "id", "sentAt", "text"], messages[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["avatar", "firstName", "membershipId"], messages[0].GetProperty("author").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["messages", "newCount", "threadId"], preview.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(4, preview.GetProperty("newCount").GetInt32());
        Assert.Equal(thread.GetProperty("unreadCount").GetInt32(), preview.GetProperty("newCount").GetInt32());
    }

    // Given unread messages,
    // when the member marks the thread read,
    // then the preview still shows the messages and none is new.
    [Fact]
    public async Task The_new_count_follows_the_read_point()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var latest = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");

        var before = await PreviewAsync(joel, lakeside.Id);
        await joel.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/read", new { lastReadMessageId = latest.GetProperty("id").GetGuid() });
        var after = await PreviewAsync(joel, lakeside.Id);

        Assert.Equal(1, before.GetProperty("newCount").GetInt32());
        Assert.Equal(0, after.GetProperty("newCount").GetInt32());
        Assert.Equal(["Morning all"], Texts(after));
    }

    // Given a Popkin where nobody has written, though someone popped in,
    // when its Host reads the preview,
    // then it has no messages; the note still counts as new, as it does in the thread.
    [Fact]
    public async Task A_thread_nobody_has_written_in_previews_no_messages()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var alone = await PreviewAsync(lakeside.Host, lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var withNote = await PreviewAsync(lakeside.Host, lakeside.Id);
        var thread = await lakeside.Host.EveryoneThreadAsync(lakeside.Id);

        Assert.Equal(0, alone.GetProperty("messages").GetArrayLength());
        Assert.Equal(0, alone.GetProperty("newCount").GetInt32());
        Assert.Equal(0, withNote.GetProperty("messages").GetArrayLength());
        Assert.Equal(thread.GetProperty("unreadCount").GetInt32(), withNote.GetProperty("newCount").GetInt32());
    }

    // Given a signed-in person who is not a member,
    // when they ask for the preview of a Popkin, or of one that does not exist,
    // then both answer 404 popkin_not_found, and no session answers 401;
    // a wrapped-up Popkin still reads for its members.
    [Fact]
    public async Task Only_a_member_reads_the_preview()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/threads/everyone/preview")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/threads/everyone/preview")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/threads/everyone/preview")).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/threads/everyone/preview")).StatusCode);
    }
}
