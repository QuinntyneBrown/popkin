using System.Net;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>GET /api/popkins/{popkinId}/threads/{threadId}/messages: paging (L2-027 AC5) and the recovery reads.</summary>
public sealed class ReadMessagesTests
{
    private static List<string> Numbered(int from, int to) =>
        Enumerable.Range(from, to - from + 1).Select(n => $"Message {n}").ToList();

    // Given a thread of 120 messages,
    // when a member opens it, then they get the latest 50, oldest first, and more lie before;
    // when they page before the oldest shown, then the 50 before it, and at the start no more.
    [Fact]
    public async Task A_long_thread_opens_on_its_latest_50_and_pages_back_to_its_start()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ids = await api.AddMessagesAsync(lakeside.Id, 120, TimeSpan.FromSeconds(1));

        var latest = await lakeside.Host.MessagesAsync(lakeside.Id, threadId);
        var earlier = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"before={ids[70]}");
        var first = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"before={ids[20]}&limit=50");

        Assert.Equal(Numbered(71, 120), latest.Texts());
        Assert.True(latest.GetProperty("hasMore").GetBoolean());
        Assert.Equal(Numbered(21, 70), earlier.Texts());
        Assert.True(earlier.GetProperty("hasMore").GetBoolean());
        Assert.Equal(Numbered(1, 20), first.Texts());
        Assert.False(first.GetProperty("hasMore").GetBoolean());
    }

    // Given a member who missed messages,
    // when they read after the newest they hold, then the next 50, oldest first, and whether newer ones remain.
    [Fact]
    public async Task Catching_up_reads_the_pages_after_a_message()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ids = await api.AddMessagesAsync(lakeside.Id, 120, TimeSpan.FromSeconds(1));

        var next = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"after={ids[49]}");
        var last = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"after={ids[99]}");
        var none = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"after={ids[119]}");

        Assert.Equal(Numbered(51, 100), next.Texts());
        Assert.True(next.GetProperty("hasMore").GetBoolean());
        Assert.Equal(Numbered(101, 120), last.Texts());
        Assert.False(last.GetProperty("hasMore").GetBoolean());
        Assert.Empty(none.Texts());
        Assert.False(none.GetProperty("hasMore").GetBoolean());
    }

    // Given messages on screen, when the client re-reads the window between two of them,
    // then it gets every message from the first to the last, both included, however many.
    [Fact]
    public async Task A_window_reads_every_message_between_two_both_included()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ids = await api.AddMessagesAsync(lakeside.Id, 120, TimeSpan.FromSeconds(1));

        var window = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"from={ids[9]}&to={ids[79]}");

        Assert.Equal(Numbered(10, 80), window.Texts());
        Assert.False(window.GetProperty("hasMore").GetBoolean());
    }

    // A page is at most 50: a smaller limit is kept, a larger or non-positive one is 50.
    [Theory]
    [InlineData("limit=10", 10)]
    [InlineData("limit=50", 50)]
    [InlineData("limit=500", 50)]
    [InlineData("limit=0", 50)]
    [InlineData("limit=-3", 50)]
    public async Task A_page_holds_at_most_50_messages(string query, int expected)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await api.AddMessagesAsync(lakeside.Id, 60, TimeSpan.FromSeconds(1));

        var page = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, query);

        Assert.Equal(Numbered(61 - expected, 60), page.Texts());
        Assert.True(page.GetProperty("hasMore").GetBoolean());
    }

    // Given messages sent at the same instant, when a member pages back through them,
    // then every message is read once: the order is by time, then id.
    [Fact]
    public async Task Messages_of_the_same_instant_are_each_read_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ids = await api.AddMessagesAsync(lakeside.Id, 25, TimeSpan.Zero);

        var read = new List<Guid>();
        var page = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, "limit=10");
        while (true)
        {
            var pageIds = page.GetProperty("items").EnumerateArray().Select(m => m.GetProperty("id").GetGuid()).ToList();
            read.InsertRange(0, pageIds);
            if (!page.GetProperty("hasMore").GetBoolean())
            {
                break;
            }

            page = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"before={pageIds[0]}&limit=10");
        }

        Assert.Equal(ids.Order(), read);
        var forward = await lakeside.Host.MessagesAsync(lakeside.Id, threadId, $"after={read[4]}&limit=50");
        Assert.Equal(read.Skip(5), forward.GetProperty("items").EnumerateArray().Select(m => m.GetProperty("id").GetGuid()));
    }

    // A cursor that is not a message of the thread is refused: 400 message_not_found.
    [Theory]
    [InlineData("before={0}", "before")]
    [InlineData("after={0}", "after")]
    [InlineData("from={0}&to={1}", "from")]
    [InlineData("from={1}&to={0}", "to")]
    public async Task A_cursor_must_be_a_message_of_the_thread(string query, string field)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ids = await api.AddMessagesAsync(lakeside.Id, 2, TimeSpan.FromSeconds(1));

        var response = await lakeside.Host.GetAsync(
            $"/api/popkins/{lakeside.Id}/threads/{threadId}/messages?{string.Format(query, Guid.NewGuid(), ids[0])}");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "message_not_found");
        Assert.Equal(field, body.GetProperty("field").GetString());
    }
}
