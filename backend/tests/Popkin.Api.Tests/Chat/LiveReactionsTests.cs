using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// `ReactionsChanged(threadId, messageId, version, reactions)` goes to the thread's audience: the Popkin
/// for Everyone, and a direct message's two members alone (L2-024, L2-023 AC3, L2-051).
/// </summary>
public sealed class LiveReactionsTests
{
    // Given a message in Everyone and another member with Popkin open,
    // when a member reacts with a heart, twice, and then takes it away,
    // then the other receives ReactionsChanged with the version and the summary as the reactor
    // was answered, once for the reaction and once, at a higher version, for taking it away: a
    // repeat that changes nothing is not told.
    [Fact]
    public async Task A_reaction_in_Everyone_is_told_to_the_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Paddles are in the shed")).Id();
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var reacted = await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️");
        await joel.ReactedAsync(lakeside.Id, threadId, message, "❤️");
        await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️");
        await joel.UnreactAsync(lakeside.Id, threadId, message, "❤️");
        var marker = await joel.SentMessageAsync(lakeside.Id, threadId, "Got them");

        var changed = await maraHub.WaitForAsync("ReactionsChanged");
        Assert.Equal(threadId, changed.Arguments[0].GetGuid());
        Assert.Equal(message, changed.Arguments[1].GetGuid());
        Assert.Equal(reacted.Version(), changed.Arguments[2].GetInt32());
        Assert.Equal(reacted.GetProperty("reactions").GetRawText(), changed.Arguments[3].GetRawText());
        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].Id() == marker.Id());
        var told = maraHub.ReceivedNamed("ReactionsChanged");
        Assert.Equal(2, told.Count);
        Assert.True(told[1].Arguments[2].GetInt32() > told[0].Arguments[2].GetInt32());
        Assert.Empty(told[1].Arguments[3].EnumerateArray());
    }

    // Given Mara, Walt and Ruth with Popkin open, and a message of the direct message between Mara and Walt,
    // when Walt reacts to it,
    // then Mara and Walt receive ReactionsChanged; and Ruth, who then receives the reaction to a
    // message of Everyone, received none before it.
    [Fact]
    public async Task A_reaction_in_a_direct_message_is_told_to_its_two_members_alone()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyoneId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var walt = await api.JoinedAsync(lakeside.Code, "Walt", "(415) 555-0191");
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth", "(415) 555-0166");
        var directId = await lakeside.Host.DirectThreadIdAsync(lakeside.Id, await walt.MembershipIdAsync(lakeside.Id));
        var direct = (await lakeside.Host.SentMessageAsync(lakeside.Id, directId, "Only for you, Walt")).Id();
        var shared = (await lakeside.Host.SentMessageAsync(lakeside.Id, everyoneId, "Dinner at seven")).Id();
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var waltHub = await api.CreateHubConnectionAsync(walt);
        await using var ruthHub = await api.CreateHubConnectionAsync(ruth);

        await walt.ReactedAsync(lakeside.Id, directId, direct, "👍🏽");
        await walt.ReactedAsync(lakeside.Id, everyoneId, shared, "🔥");

        await maraHub.WaitForAsync("ReactionsChanged", e => e.Arguments[1].GetGuid() == direct);
        await waltHub.WaitForAsync("ReactionsChanged", e => e.Arguments[1].GetGuid() == direct);
        await ruthHub.WaitForAsync("ReactionsChanged");
        var ruths = Assert.Single(ruthHub.ReceivedNamed("ReactionsChanged"));
        Assert.Equal(shared, ruths.Arguments[1].GetGuid());
    }
}
