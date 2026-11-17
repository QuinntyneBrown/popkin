using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>PUT /api/me/notifications/…: each change saves at once and touches nothing else (L2-154, L2-156, L2-157).</summary>
public sealed class NotificationSettingChangesTests
{
    private static async Task<JsonElement> KindAsync(HttpClient client, string kind)
    {
        var settings = await client.GetFromJsonAsync<JsonElement>("/api/me/notifications");
        return settings.GetProperty("groups").EnumerateArray()
            .SelectMany(g => g.GetProperty("kinds").EnumerateArray())
            .Single(k => k.GetProperty("kind").GetString() == kind);
    }

    private static async Task<JsonElement> EmailAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("email");

    // Given Mara with "Group chat" off by email and on by phone, when she turns it on by email,
    // then it reads on by email and still on by phone (L2-157 AC3).
    [Fact]
    public async Task One_channel_of_one_kind_is_switched_and_nothing_else_moves()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");

        var response = await mara.PutAsJsonAsync("/api/me/notifications/kinds/GroupChat", new { email = true });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var groupChat = await KindAsync(mara, "GroupChat");
        Assert.True(groupChat.GetProperty("email").GetBoolean());
        Assert.True(groupChat.GetProperty("phone").GetBoolean());
        Assert.True((await KindAsync(mara, "NewPhotos")).GetProperty("email").GetBoolean());
    }

    // Given "Sign-in codes and security", when Mara asks to switch it off, then 400
    // `notification_required` and nothing changes (L2-154 AC2).
    [Fact]
    public async Task The_required_kind_cannot_be_switched_off()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");

        var response = await mara.PutAsJsonAsync("/api/me/notifications/kinds/SignInAndSecurity", new { email = false });

        await response.AssertProblem(HttpStatusCode.BadRequest, "notification_required");
        Assert.True((await KindAsync(mara, "SignInAndSecurity")).GetProperty("email").GetBoolean());
    }

    // An unknown kind answers 400 `invalid_kind`; a change of neither channel answers 400
    // `nothing_to_change` (L2-174 AC5).
    [Theory]
    [InlineData("Gossip", "{\"email\":true}", "invalid_kind")]
    [InlineData("3", "{\"email\":true}", "invalid_kind")]
    [InlineData("GroupChat", "{}", "nothing_to_change")]
    public async Task A_kind_change_outside_the_catalogue_is_refused(string kind, string body, string code)
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");

        var response = await mara.PutAsync(
            $"/api/me/notifications/kinds/{kind}", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));

        await response.AssertProblem(HttpStatusCode.BadRequest, code);
    }

    // Given Mara with "New photos" off by email, when she switches email off and on again, then
    // email reads off then on, and "New photos" is still off by email (L2-156 AC3, AC4, L2-157 AC4).
    [Fact]
    public async Task Email_off_then_on_keeps_every_choice()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");
        (await mara.PutAsJsonAsync("/api/me/notifications/kinds/NewPhotos", new { email = false })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.NoContent, (await mara.PutAsJsonAsync("/api/me/notifications/email", new { on = false })).StatusCode);
        Assert.False((await EmailAsync(mara)).GetProperty("on").GetBoolean());

        (await mara.PutAsJsonAsync("/api/me/notifications/email", new { on = true })).EnsureSuccessStatusCode();

        Assert.True((await EmailAsync(mara)).GetProperty("on").GetBoolean());
        Assert.False((await KindAsync(mara, "NewPhotos")).GetProperty("email").GetBoolean());
    }

    // Given Theo, who has no email address, when he turns email on, then 409 `no_email_address` (L2-156 AC5).
    [Fact]
    public async Task Email_cannot_be_turned_on_without_an_email_address()
    {
        using var api = new ApiFactory();
        var theo = await api.SignedUpAsync("Theo Lin", "(415) 555-0100");

        var response = await theo.PutAsJsonAsync("/api/me/notifications/email", new { on = true });

        await response.AssertProblem(HttpStatusCode.Conflict, "no_email_address");
    }

    // When Mara chooses the daily digest, then it reads chosen; an unknown frequency answers 400
    // `invalid_frequency` (L2-156 AC1, L2-174 AC5).
    [Fact]
    public async Task A_frequency_is_one_of_three()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");

        Assert.Equal(HttpStatusCode.NoContent,
            (await mara.PutAsJsonAsync("/api/me/notifications/frequency", new { frequency = "DailyDigest" })).StatusCode);
        Assert.Equal("DailyDigest", (await EmailAsync(mara)).GetProperty("frequency").GetString());

        var refused = await mara.PutAsJsonAsync("/api/me/notifications/frequency", new { frequency = "Hourly" });

        await refused.AssertProblem(HttpStatusCode.BadRequest, "invalid_frequency");
        Assert.Equal("DailyDigest", (await EmailAsync(mara)).GetProperty("frequency").GetString());
    }
}
