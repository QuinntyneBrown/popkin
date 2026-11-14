using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>POST /api/popkins/{popkinId}/threads/{threadId}/messages (L2-021, L2-045 AC2, L2-051, L2-052).</summary>
public sealed class SendMessageTests
{
    // Given a member with the Everyone thread open,
    // when they post text with white space around it,
    // then the message is stored trimmed, at the server's time, under their name,
    // and anyone in the Popkin reads it at once.
    [Fact]
    public async Task A_member_posts_to_everyone_and_the_message_is_readable_at_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var viewer = (await lakeside.Host.EveryoneThreadAsync(lakeside.Id)).GetProperty("viewer");
        api.Clock.Advance(TimeSpan.FromMinutes(3));
        var clientMessageId = Guid.NewGuid();

        var response = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "  Who's bringing the firewood?\n ", clientMessageId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var message = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.NotEqual(Guid.Empty, message.GetProperty("id").GetGuid());
        Assert.Equal(threadId, message.GetProperty("threadId").GetGuid());
        Assert.Equal(lakeside.Id, message.GetProperty("popkinId").GetGuid());
        Assert.Equal(clientMessageId, message.GetProperty("clientMessageId").GetGuid());
        Assert.Equal("Member", message.GetProperty("kind").GetString());
        Assert.Equal("Who's bringing the firewood?", message.GetProperty("text").GetString());
        Assert.Equal(api.Clock.GetUtcNow(), message.GetProperty("sentAt").GetDateTimeOffset());
        var author = message.GetProperty("author");
        Assert.Equal(viewer.GetProperty("membershipId").GetGuid(), author.GetProperty("membershipId").GetGuid());
        Assert.Equal("Mara", author.GetProperty("firstName").GetString());
        Assert.Equal("MO", author.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(
            ["author", "clientMessageId", "id", "kind", "popkinId", "quote", "reactions", "reactionsVersion", "sentAt", "text", "threadId"],
            message.EnumerateObject().Select(p => p.Name).Order());

        var page = await lakeside.Host.MessagesAsync(lakeside.Id, threadId);
        Assert.Equal(message.GetRawText(), page.GetProperty("items")[0].GetRawText());
        Assert.Equal(["Who's bringing the firewood?"], page.Texts());
        Assert.False(page.GetProperty("hasMore").GetBoolean());
    }

    // Given a member, when they post only white space, then 400 message_empty names `text`
    // and nothing is stored (L2-021 AC6).
    [Theory]
    [InlineData("   \n\t ")]
    [InlineData("")]
    [InlineData(null)]
    public async Task A_message_of_only_white_space_is_refused(string? text)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var response = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, text);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "message_empty");
        Assert.Equal("text", body.GetProperty("field").GetString());
        Assert.Empty((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a member, when they post without a client message id, or an empty one,
    // then 400 client_message_id_required names `clientMessageId`.
    [Fact]
    public async Task A_message_needs_a_client_message_id()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var url = $"/api/popkins/{lakeside.Id}/threads/{threadId}/messages";

        var missing = await lakeside.Host.PostAsJsonAsync(url, new { text = "Hello" });
        var empty = await lakeside.Host.PostAsJsonAsync(url, new { clientMessageId = Guid.Empty, text = "Hello" });

        Assert.Equal("clientMessageId", (await missing.AssertProblem(HttpStatusCode.BadRequest, "client_message_id_required")).GetProperty("field").GetString());
        Assert.Equal("clientMessageId", (await empty.AssertProblem(HttpStatusCode.BadRequest, "client_message_id_required")).GetProperty("field").GetString());
        Assert.Empty((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a member, when they post 2,000 characters it is stored,
    // and when they post 2,001 it is refused with message_too_long (L2-021 AC7).
    [Fact]
    public async Task A_message_holds_at_most_2000_characters()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);

        var atLimit = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, " " + new string('a', 2000) + " ");
        var over = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, new string('a', 2001));

        Assert.Equal(HttpStatusCode.Created, atLimit.StatusCode);
        var body = await over.AssertProblem(HttpStatusCode.BadRequest, "message_too_long");
        Assert.Equal("text", body.GetProperty("field").GetString());
        Assert.Single((await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a member, when they post markup, then it is stored and returned as the text typed,
    // never interpreted (L2-052 AC2).
    [Fact]
    public async Task Markup_is_kept_as_the_text_that_was_typed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        const string typed = "<script>alert('hi')</script> <b>bold</b> &amp; \"quotes\"\nline two";

        var message = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, typed);

        Assert.Equal(typed, message.GetProperty("text").GetString());
        Assert.Equal([typed], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a wrapped-up Popkin, when a member posts, then 409 popkin_wrapped_up and nothing is
    // added, though the messages can still be read (L2-045 AC1, AC2).
    [Fact]
    public async Task Nobody_posts_to_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "See you all next year");
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "One more thing");

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(["See you all next year"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }

    // Given a person who is not a member, when they read or post, then 404 popkin_not_found;
    // and a member who names a thread of another Popkin, or none, gets 404 thread_not_found (L2-051).
    [Fact]
    public async Task Messages_belong_to_the_members_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Members only");
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var other = await stranger.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var otherId = (await other.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var otherThreadId = await stranger.EveryoneThreadIdAsync(otherId);

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.SendMessageAsync(lakeside.Id, threadId, "Let me in")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        // Their own Popkin does not open another Popkin's thread.
        await (await stranger.GetAsync($"/api/popkins/{otherId}/threads/{threadId}/messages")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await (await stranger.SendMessageAsync(otherId, threadId, "Let me in")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/threads/{otherThreadId}/messages")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        await (await lakeside.Host.SendMessageAsync(lakeside.Id, Guid.NewGuid(), "Hello?")).AssertProblem(HttpStatusCode.NotFound, "thread_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().SendMessageAsync(lakeside.Id, threadId, "Hello")).StatusCode);
        Assert.Equal(["Members only"], (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).Texts());
    }
}
