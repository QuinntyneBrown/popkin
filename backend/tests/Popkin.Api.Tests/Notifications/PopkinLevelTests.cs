using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>How much each Popkin tells a member (popkin-levels; L2-158).</summary>
public sealed class PopkinLevelTests
{
    private static async Task<JsonElement> PopkinsAsync(HttpClient member) =>
        (await member.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("popkins");

    private static Task<HttpResponseMessage> SetLevelAsync(HttpClient member, Guid popkinId, string level) =>
        member.PutAsJsonAsync($"/api/me/notifications/popkins/{popkinId}", new { level });

    // Given Ruth joined Lakeside, then it is listed with its people and level "Everything" (AC1, AC6).
    [Fact]
    public async Task A_new_membership_reads_everything()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");

        var row = Assert.Single((await PopkinsAsync(ruth)).EnumerateArray());

        Assert.Equal(lakeside.Id, row.GetProperty("popkinId").GetGuid());
        Assert.Equal("Lakeside Weekend", row.GetProperty("name").GetString());
        Assert.Equal(2, row.GetProperty("people").GetInt32());
        Assert.Equal("Everything", row.GetProperty("level").GetString());
    }

    // When Ruth mutes Lakeside, then it reads "Muted" (AC2).
    [Fact]
    public async Task A_level_set_is_read_back()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");

        Assert.Equal(HttpStatusCode.NoContent, (await SetLevelAsync(ruth, lakeside.Id, "Muted")).StatusCode);

        Assert.Equal("Muted", (await PopkinsAsync(ruth))[0].GetProperty("level").GetString());
    }

    // A Popkin the person is not in, or has left, is not found; a level not in the list is refused (AC7).
    [Fact]
    public async Task Another_popkin_a_left_one_and_an_unknown_level_are_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var stranger = await api.SignedUpByEmailAsync("Theo", "theo@example.com");

        var notMine = await SetLevelAsync(stranger, lakeside.Id, "Muted");
        var unknown = await SetLevelAsync(ruth, lakeside.Id, "Loud");
        await api.LeaveAsync(lakeside.Id, "Ruth Lindqvist");
        var left = await SetLevelAsync(ruth, lakeside.Id, "Muted");

        await notMine.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await left.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await unknown.AssertProblem(HttpStatusCode.BadRequest, "invalid_level");
        Assert.Empty((await PopkinsAsync(ruth)).EnumerateArray());
    }

    // Given Ruth on "Just for me", when Joel writes in Everyone and then replies to her, then only
    // the reply reaches her phone; on "Muted", neither does (AC2, AC3).
    [Fact]
    public async Task Just_for_me_lets_replies_through_and_muted_lets_nothing_through()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel", "(415) 555-0123");
        await ruth.AllowsAlertsAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Paddles?")).Id();
        await api.DispatchAsync();
        api.PhoneAlerts.Clear();

        (await SetLevelAsync(ruth, lakeside.Id, "JustForMe")).EnsureSuccessStatusCode();
        await joel.SentMessageAsync(lakeside.Id, everyone, "Leaving at six");
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Mine");
        await api.DispatchAsync();
        var justForMe = api.PhoneAlerts.Sent.Select(s => s.Alert.Body).ToList();
        api.PhoneAlerts.Clear();

        (await SetLevelAsync(ruth, lakeside.Id, "Muted")).EnsureSuccessStatusCode();
        await joel.SentMessageAsync(lakeside.Id, everyone, "Bring snacks");
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "And the oars");
        await api.DispatchAsync();

        Assert.Equal(["Joel replied to you"], justForMe);
        Assert.Empty(api.PhoneAlerts.Sent);
    }
}
