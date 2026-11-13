using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>
/// The unread count of a Popkin, on its home and on its card of My Popkins, counts the reader's
/// direct messages of that Popkin as well as Everyone, and nobody else's (L2-022 AC3, L2-027 AC3).
/// </summary>
public sealed class DirectUnreadTests
{
    private static async Task<int> HomeUnreadAsync(HttpClient member, Guid popkinId) =>
        (await member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}")).GetProperty("unreadCount").GetInt32();

    private static async Task<int> CardUnreadAsync(HttpClient member, Guid popkinId) =>
        (await member.GetFromJsonAsync<JsonElement>("/api/popkins")).GetProperty("active").EnumerateArray()
            .Single(p => p.GetProperty("id").GetGuid() == popkinId).GetProperty("unreadCount").GetInt32();

    // Given a member with the notes of two members popping in unread in Everyone, two unread
    // messages in a direct message, and a direct message of two other members,
    // when they read their Popkin's home and My Popkins,
    // then both count four; and once they read the direct message, both count two.
    [Fact]
    public async Task A_Popkins_unread_count_holds_the_readers_direct_messages()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = lakeside.Host;
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var withMara = await walt.DirectThreadIdAsync(lakeside.Id, await mara.MembershipIdAsync(lakeside.Id));
        var withRuth = await walt.DirectThreadIdAsync(lakeside.Id, await ruth.MembershipIdAsync(lakeside.Id));
        await walt.SentMessageAsync(lakeside.Id, withMara, "Did you pack the stove?");
        api.Clock.Advance(TimeSpan.FromSeconds(10));
        var latest = await walt.SentMessageAsync(lakeside.Id, withMara, "And the kettle?");
        await walt.SentMessageAsync(lakeside.Id, withRuth, "Not for Mara");

        Assert.Equal(4, await HomeUnreadAsync(mara, lakeside.Id));
        Assert.Equal(4, await CardUnreadAsync(mara, lakeside.Id));

        await mara.PutAsJsonAsync(
            $"/api/popkins/{lakeside.Id}/threads/{withMara}/read", new { lastReadMessageId = latest.GetProperty("id").GetGuid() });

        Assert.Equal(2, await HomeUnreadAsync(mara, lakeside.Id));
        Assert.Equal(2, await CardUnreadAsync(mara, lakeside.Id));
    }
}
