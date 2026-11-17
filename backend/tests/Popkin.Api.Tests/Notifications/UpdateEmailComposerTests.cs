using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Notifications.Emails;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// PopkinUpdateEmailComposer on InMemory, one case per row of popkin-update-email's tests: the
/// messages are posted through the API, and the bundle is composed directly.
/// </summary>
public sealed class UpdateEmailComposerTests
{
    private sealed record Setup(ApiFactory Api, StartedPopkin Lakeside, Guid Everyone, HttpClient Ruth, Guid RuthId, HttpClient Joel);

    private static async Task<Setup> LakesideAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        return new Setup(api, lakeside, everyone, ruth, await ruth.PersonIdAsync(), joel);
    }

    /// <summary>Composes the message events of Ruth's bundle, as the dispatcher would.</summary>
    private static async Task<PopkinUpdateEmailModel?> ComposeAsync(Setup s, params NotificationKind[] kinds)
    {
        using var scope = s.Api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.NotificationEvents.AsNoTracking()
            .Where(e => kinds.Contains(e.Kind) && (e.RecipientPersonId == s.RuthId || e.Kind == NotificationKind.GroupChat))
            .ToListAsync();
        var email = OutgoingEmail.OpenUpdate(s.RuthId, s.Lakeside.Id, s.Api.Clock.GetUtcNow(), s.Api.Clock.GetUtcNow());
        return await scope.ServiceProvider.GetRequiredService<PopkinUpdateEmailComposer>()
            .ComposeAsync(email, events, TimeZoneInfo.Utc, 10, CancellationToken.None);
    }

    // A reply shows the recipient's own message above it, and its envelope names the replier.
    [Fact]
    public async Task A_reply_shows_the_recipients_own_message()
    {
        using var api = new ApiFactory();
        var s = await LakesideAsync(api);
        var asked = (await s.Ruth.SentMessageAsync(s.Lakeside.Id, s.Everyone, "Paddles?")).Id();
        await s.Joel.RepliedAsync(s.Lakeside.Id, s.Everyone, asked, "Mine");

        var model = await ComposeAsync(s, NotificationKind.MentionsAndReplies);

        var lead = Assert.IsType<MessageLead>(model!.Lead);
        Assert.Equal("Joel replied to you", lead.Headline);
        Assert.Equal("Joel Brennan", lead.AuthorName);
        Assert.Equal("Mine", lead.Text);
        Assert.Equal("Paddles?", lead.Answers!.Text);
        Assert.Equal("Joel via Popkin", model.Shell.FromDisplayName);
        Assert.Equal("Reply in Popkin", lead.Button.Label);
        Assert.Equal("Mine", model.Shell.Preheader);
    }

    // A direct message leads with its own headline and opens the direct message.
    [Fact]
    public async Task A_direct_message_opens_the_direct_message()
    {
        using var api = new ApiFactory();
        var s = await LakesideAsync(api);
        var maraMember = await s.Lakeside.Host.MembershipIdAsync(s.Lakeside.Id);
        var direct = await s.Lakeside.Host.DirectThreadIdAsync(s.Lakeside.Id, await s.Ruth.MembershipIdAsync(s.Lakeside.Id));
        await s.Lakeside.Host.SentMessageAsync(s.Lakeside.Id, direct, "Lunch?");

        var model = await ComposeAsync(s, NotificationKind.DirectMessages);

        Assert.Equal("Mara sent you a message", model!.Lead.Headline);
        Assert.Equal("Mara sent you a message in Lakeside Weekend", model.Shell.Subject);
        Assert.EndsWith($"/p/{s.Lakeside.Id}/chat/{maraMember}", model.Lead.Button.Url);
    }

    // The newest change leads; the next three follow, newest first; a fifth is not listed (L2-164 AC6).
    [Fact]
    public async Task The_newest_leads_and_three_follow()
    {
        using var api = new ApiFactory();
        var s = await LakesideAsync(api);
        foreach (var text in new[] { "one", "two", "three", "four", "five" })
        {
            await s.Joel.SentMessageAsync(s.Lakeside.Id, s.Everyone, text);
            api.Clock.Advance(TimeSpan.FromMinutes(1));
        }

        var model = await ComposeAsync(s, NotificationKind.GroupChat);

        Assert.Equal("five", Assert.IsType<MessageLead>(model!.Lead).Text);
        Assert.Equal("Joel in Lakeside Weekend", model.Lead.Headline);
        Assert.Equal(["Joel: “four”", "Joel: “three”", "Joel: “two”"], model.AlsoNew.Select(r => r.Line));
    }

    // A message deleted since is left out; a bundle of only deleted changes gives no email (L2-161 AC9).
    [Fact]
    public async Task A_deleted_message_is_left_out_and_nothing_left_gives_no_email()
    {
        using var api = new ApiFactory();
        var s = await LakesideAsync(api);
        var gone = (await s.Joel.SentMessageAsync(s.Lakeside.Id, s.Everyone, "gone")).Id();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var kept = (await s.Joel.SentMessageAsync(s.Lakeside.Id, s.Everyone, "kept")).Id();
        (await s.Joel.DeleteMessageAsync(s.Lakeside.Id, s.Everyone, gone)).EnsureSuccessStatusCode();

        var one = await ComposeAsync(s, NotificationKind.GroupChat);
        (await s.Joel.DeleteMessageAsync(s.Lakeside.Id, s.Everyone, kept)).EnsureSuccessStatusCode();
        var none = await ComposeAsync(s, NotificationKind.GroupChat);

        Assert.Equal("kept", Assert.IsType<MessageLead>(one!.Lead).Text);
        Assert.Empty(one.AlsoNew);
        Assert.Null(none);
    }
}
