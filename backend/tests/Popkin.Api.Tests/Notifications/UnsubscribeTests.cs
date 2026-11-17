using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Notifications;
using Popkin.Application.Notifications.Emails;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// "Unsubscribe from all email" and the mail client's own one-click button (unsubscribe design;
/// L2-168 AC3 to AC6). No session is needed: the token is the proof.
/// </summary>
public sealed class UnsubscribeTests
{
    private static string TokenFor(ApiFactory api, Guid personId) =>
        api.Services.GetRequiredService<IUnsubscribeTokens>().Issue(personId);

    private static HttpClient MailClient(ApiFactory api)
    {
        var client = api.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "cross-site");
        return client;
    }

    private static Task<HttpResponseMessage> OneClickAsync(HttpClient client, string token) =>
        client.PostAsync(
            $"/api/notifications/unsubscribe?t={Uri.EscapeDataString(token)}",
            new FormUrlEncodedContent([new KeyValuePair<string, string>("List-Unsubscribe", "One-Click")]));

    private static async Task<bool> EmailOnAsync(HttpClient member) =>
        (await member.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("email").GetProperty("on").GetBoolean();

    // Given Ruth's email, when her mail client posts the one-click unsubscribe from another site
    // with no session, then email is off, and a second post changes nothing (AC4, AC6).
    [Fact]
    public async Task One_click_turns_email_off_without_a_session_and_again_changes_nothing()
    {
        using var api = new ApiFactory();
        var ruth = await api.SignedUpByEmailAsync("Ruth Lindqvist", "ruth@example.com");
        var token = TokenFor(api, await ruth.PersonIdAsync());
        var mail = MailClient(api);

        var first = await OneClickAsync(mail, token);
        var second = await OneClickAsync(mail, token);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.False(await EmailOnAsync(ruth));
    }

    // Given Ruth's update email, when her mail client posts its List-Unsubscribe address, then the
    // next change reaches her by no email: the link the Worker wrote is read by the API (AC4).
    [Fact]
    public async Task The_link_in_a_sent_email_stops_the_next_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        api.NotificationEmails.Clear();
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Put me down for the paddles");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        var first = Assert.Single(api.NotificationEmails.Sent);
        var oneClick = new Uri(first.UnsubscribePostUrl);

        var answer = await MailClient(api).PostAsync(
            oneClick.PathAndQuery,
            new FormUrlEncodedContent([new KeyValuePair<string, string>("List-Unsubscribe", "One-Click")]));
        api.NotificationEmails.Clear();
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "And the oars");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();

        Assert.Equal(HttpStatusCode.OK, answer.StatusCode);
        Assert.Contains("/unsubscribe?t=", first.UnsubscribeUrl);
        Assert.Empty(api.NotificationEmails.Sent);
    }

    // The page posts with an empty body and reads that it is unsubscribed (AC3).
    [Fact]
    public async Task The_page_posts_with_an_empty_body()
    {
        using var api = new ApiFactory();
        var ruth = await api.SignedUpByEmailAsync("Ruth Lindqvist", "ruth@example.com");
        var page = api.CreateBrowserClient();

        var answer = await page.PostAsync($"/api/notifications/unsubscribe?t={Uri.EscapeDataString(TokenFor(api, await ruth.PersonIdAsync()))}", null);

        Assert.Equal(HttpStatusCode.OK, answer.StatusCode);
        Assert.True((await answer.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("unsubscribed").GetBoolean());
    }

    // A GET never unsubscribes; a changed or missing token says only that the link expired (AC5);
    // the cross-site exception holds for this path alone (L2-050 AC2).
    [Fact]
    public async Task A_get_a_bad_token_and_another_path_are_refused()
    {
        using var api = new ApiFactory();
        var ruth = await api.SignedUpByEmailAsync("Ruth Lindqvist", "ruth@example.com");
        var token = TokenFor(api, await ruth.PersonIdAsync());
        var mail = MailClient(api);

        var get = await mail.GetAsync($"/api/notifications/unsubscribe?t={Uri.EscapeDataString(token)}");
        var changed = await OneClickAsync(mail, token[..^2] + (token[^2] == 'A' ? "BA" : "AA"));
        var none = await mail.PostAsync("/api/notifications/unsubscribe", null);
        var elsewhere = await mail.PutAsJsonAsync("/api/me/notifications/email", new { on = false });

        Assert.Equal(HttpStatusCode.MethodNotAllowed, get.StatusCode);
        await changed.AssertProblem(HttpStatusCode.Gone, "unsubscribe_link_expired");
        await none.AssertProblem(HttpStatusCode.Gone, "unsubscribe_link_expired");
        await elsewhere.AssertProblem(HttpStatusCode.Forbidden, "cross_site_request");
        Assert.True(await EmailOnAsync(ruth));
    }

    // One case per row of "Token rules": the age by TimeProvider, a deleted person, another
    // purpose; turning email off keeps every kind's choice (L2-156 AC3).
    [Theory]
    [InlineData("valid", UnsubscribeOutcome.Unsubscribed)]
    [InlineData("already off", UnsubscribeOutcome.AlreadyOff)]
    [InlineData("90 days less a minute", UnsubscribeOutcome.Unsubscribed)]
    [InlineData("90 days and a minute", UnsubscribeOutcome.Expired)]
    [InlineData("deleted person", UnsubscribeOutcome.Expired)]
    [InlineData("another purpose", UnsubscribeOutcome.Expired)]
    public async Task Each_token_rule(string row, UnsubscribeOutcome expected)
    {
        using var api = new ApiFactory();
        var ruth = await api.SignedUpByEmailAsync("Ruth Lindqvist", "ruth@example.com");
        (await ruth.PutAsJsonAsync("/api/me/notifications/kinds/GroupChat", new { email = true })).EnsureSuccessStatusCode();
        var personId = await ruth.PersonIdAsync();
        var token = row == "another purpose"
            ? api.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("Popkin.Something.Else").Protect(personId.ToString("N"))
            : TokenFor(api, personId);
        switch (row)
        {
            case "already off":
                (await ruth.PutAsJsonAsync("/api/me/notifications/email", new { on = false })).EnsureSuccessStatusCode();
                break;
            case "90 days less a minute":
                api.Clock.Advance(TimeSpan.FromDays(90) - TimeSpan.FromMinutes(1));
                break;
            case "90 days and a minute":
                api.Clock.Advance(TimeSpan.FromDays(90) + TimeSpan.FromMinutes(1));
                break;
            case "deleted person":
                using (var scope = api.Services.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    db.People.Single(p => p.Id == personId).MarkDeleted(api.Clock.GetUtcNow());
                    await db.SaveChangesAsync();
                }

                break;
        }

        UnsubscribeOutcome outcome;
        using (var scope = api.Services.CreateScope())
        {
            outcome = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new UnsubscribeFromAllEmailCommand(token));
        }

        Assert.Equal(expected, outcome);
        if (row == "valid")
        {
            var settings = await ruth.GetFromJsonAsync<JsonElement>("/api/me/notifications");
            var groupChat = settings.GetProperty("groups")[0].GetProperty("kinds").EnumerateArray()
                .Single(k => k.GetProperty("kind").GetString() == "GroupChat");
            Assert.False(settings.GetProperty("email").GetProperty("on").GetBoolean());
            Assert.True(groupChat.GetProperty("phone").GetBoolean());
        }
    }
}
