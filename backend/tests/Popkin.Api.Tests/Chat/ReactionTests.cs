using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// PUT and DELETE /api/popkins/{popkinId}/threads/{threadId}/messages/{messageId}/reactions/{emoji}:
/// a member adds an emoji to a message and takes it away again (L2-024).
/// </summary>
public sealed class ReactionTests
{
    // Given a message of Mara's in Everyone, and Joel a member,
    // when Joel reacts with a heart, twice,
    // then 200 both times with the message's whole summary, the heart chosen by Joel once;
    // and when Mara reacts with a heart and then with laughing,
    // then the summary groups by emoji in order of first use, with who chose each;
    // and every read of the thread's messages carries the same summary.
    [Fact]
    public async Task A_member_reacts_and_the_summary_groups_by_emoji_in_order_of_first_use()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();

        var first = await joel.ReactAsync(lakeside.Id, threadId, message, "❤️");
        var again = await joel.ReactAsync(lakeside.Id, threadId, message, "❤️");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "❤️");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var summary = await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "😂");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal([ReactionExtensions.Chip("❤️", joelId)], await SummaryOf(again));
        Assert.Equal([ReactionExtensions.Chip("❤️", joelId, maraId), ReactionExtensions.Chip("😂", maraId)], summary.Summary());
        var read = (await joel.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == message);
        Assert.Equal(summary.GetProperty("reactions").GetRawText(), read.GetProperty("reactions").GetRawText());
    }

    // Given a message, when members react, repeat a reaction, take one away and repeat that,
    // then each change answers a reactions version one above the last, a repeat that changes
    // nothing answers the same version, and the read of the message carries the last; a new
    // message is at version 0.
    [Fact]
    public async Task Every_change_raises_the_reactions_version_and_a_repeat_does_not()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var sent = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed");
        var message = sent.Id();

        var versions = new List<int>
        {
            (await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️")).Version(),
            (await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️")).Version(),
            (await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "🔥")).Version(),
            await VersionOf(await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️")),
            await VersionOf(await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️")),
        };

        Assert.Equal(0, sent.GetProperty("reactionsVersion").GetInt32());
        Assert.Equal([1, 1, 2, 3, 3], versions);
        var read = (await joel.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == message);
        Assert.Equal(3, read.GetProperty("reactionsVersion").GetInt32());
    }

    // Given a message, when Joel reacts while Mara's reaction is saved at the same moment,
    // then Joel's reaction is made again on the message as it now stands: both are kept, and
    // each change has its own version.
    [Fact]
    public async Task Two_reactions_at_the_same_moment_are_both_kept_with_their_own_versions()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var joelId = await joel.MembershipIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();
        var winner = 0;
        api.Faults.LoseNextSaveTo = async () =>
        {
            winner = (await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "🔥")).Version();
            api.Clock.Advance(TimeSpan.FromSeconds(1));
        };

        var joels = await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️");

        Assert.Equal(1, winner);
        Assert.Equal(2, joels.Version());
        Assert.Equal([ReactionExtensions.Chip("🔥", maraId), ReactionExtensions.Chip("❤️", joelId)], joels.Summary());
    }

    private static async Task<int> VersionOf(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).Version();

    // Given a message with a heart from Joel and from Mara,
    // when Joel takes his heart away, twice,
    // then 200 both times with the heart Mara's alone;
    // and when Mara takes hers away, then the heart is gone from the summary and from the read.
    [Fact]
    public async Task A_member_takes_their_reaction_away()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();
        await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️");
        await lakeside.Host.ReactedAsync(lakeside.Id, threadId, message, "❤️");

        var first = await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️");
        var again = await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️");
        var last = await lakeside.Host.UnreactAsync(lakeside.Id, threadId, message, "❤️");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal([ReactionExtensions.Chip("❤️", maraId)], await SummaryOf(again));
        Assert.Empty(await SummaryOf(last));
        var read = (await joel.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == message);
        Assert.Empty(read.GetProperty("reactions").EnumerateArray());
    }

    // Given a member with Popkin open, when another posts a message,
    // then the message, as answered and as MessageAdded carries it, has no reactions yet.
    [Fact]
    public async Task A_new_message_has_no_reactions()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var sent = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");

        Assert.Empty(sent.GetProperty("reactions").EnumerateArray());
        var added = await joelHub.WaitForAsync("MessageAdded", e => e.Arguments[0].Id() == sent.Id());
        Assert.Empty(added.Arguments[0].GetProperty("reactions").EnumerateArray());
    }

    // Given a message, when a member reacts with something that is not one emoji, or takes it away,
    // then 400 reaction_invalid names `emoji` and the message has no reaction (L2-052 AC1).
    [Theory]
    [InlineData("a")]
    [InlineData("❤️❤️")]
    public async Task A_reaction_that_is_not_one_emoji_is_refused(string emoji)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();

        var added = await lakeside.Host.ReactAsync(lakeside.Id, threadId, message, emoji);
        var removed = await lakeside.Host.UnreactAsync(lakeside.Id, threadId, message, emoji);

        var problem = await added.AssertProblem(HttpStatusCode.BadRequest, "reaction_invalid");
        Assert.Equal("emoji", problem.GetProperty("field").GetString());
        await removed.AssertProblem(HttpStatusCode.BadRequest, "reaction_invalid");
        var read = (await lakeside.Host.MessagesAsync(lakeside.Id, threadId)).GetProperty("items").EnumerateArray().Single(m => m.Id() == message);
        Assert.Empty(read.GetProperty("reactions").EnumerateArray());
    }

    private static async Task<List<string>> SummaryOf(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).Summary();
}
