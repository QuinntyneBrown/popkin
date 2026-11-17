using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Digests;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The digest emails (docs/detailed-designs/notifications/digest-emails): a person on "Daily
/// digest" or "Weekly digest" gets what happened in one email at 6 pm where they are (L2-165).
/// </summary>
public sealed class DigestEmailTests
{
    private sealed record Lakeside(StartedPopkin Popkin, Guid Everyone, HttpClient Ruth, HttpClient Joel, Guid Asked);

    private static DateTimeOffset At(DateOnly day, int hour, int minute = 0) =>
        new(day.ToDateTime(new TimeOnly(hour, minute)), TimeSpan.Zero);

    /// <summary>The next day after the clock's that falls on `weekday`, or tomorrow.</summary>
    private static DateOnly Next(ApiFactory api, DayOfWeek? weekday = null)
    {
        var day = DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime).AddDays(1);
        while (weekday is { } w && day.DayOfWeek != w)
        {
            day = day.AddDays(1);
        }

        return day;
    }

    /// <summary>Ruth, by email and on `frequency`, asked something in Lakeside's Everyone at noon on `day`.</summary>
    private static async Task<Lakeside> RuthAskedAsync(ApiFactory api, DateOnly day, string frequency = "DailyDigest")
    {
        api.Clock.SetUtcNow(At(day, 11));
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        await api.DispatchAsync();
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        (await ruth.PutAsJsonAsync("/api/me/notifications/frequency", new { frequency })).EnsureSuccessStatusCode();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        await api.DispatchAsync();
        api.Clock.SetUtcNow(At(day, 12));
        return new Lakeside(lakeside, everyone, ruth, joel, asked);
    }

    /// <summary>Joel replies to Ruth, Mara writes to her directly, and Dev joins: three changes.</summary>
    private static async Task ThreeChangesAsync(ApiFactory api, Lakeside l)
    {
        await l.Joel.RepliedAsync(l.Popkin.Id, l.Everyone, l.Asked, "Put me down for the paddles & oars");
        var direct = await l.Popkin.Host.DirectThreadIdAsync(l.Popkin.Id, await l.Ruth.MembershipIdAsync(l.Popkin.Id));
        await l.Popkin.Host.SentMessageAsync(l.Popkin.Id, direct, "Lunch after?");
        await api.JoinedAsync(l.Popkin.Code, "Dev Patel", "(415) 555-0177");
        await api.DispatchAsync();
    }

    private static async Task<int> TickAsync(ApiFactory api)
    {
        await api.SendAsync(new SendDigestsCommand());
        await api.DispatchAsync();
        return Digests(api).Count;
    }

    private static List<OutgoingEmailMessage> Digests(ApiFactory api) =>
        api.NotificationEmails.Sent.Where(e => e.Email.Subject.StartsWith("Your ", StringComparison.Ordinal)).ToList();

    // Given Ruth on "Daily digest", when three changes reach her during the day, then nothing is
    // sent before 6 pm; at 6 pm one email holds all three under Lakeside, the changes to her first;
    // and a later tick sends nothing more (L2-165 AC1, AC3, AC4, AC6; L2-175 AC3).
    [Fact]
    public async Task Three_changes_arrive_in_one_email_at_six()
    {
        using var api = new ApiFactory();
        var day = Next(api);
        var lakeside = await RuthAskedAsync(api, day);

        await ThreeChangesAsync(api, lakeside);
        api.Clock.Advance(TimeSpan.FromMinutes(15));
        await api.DispatchAsync();
        api.Clock.SetUtcNow(At(day, 17, 59));
        var beforeSix = await TickAsync(api);
        api.Clock.SetUtcNow(At(day, 18));
        var atSix = await TickAsync(api);
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        var again = await TickAsync(api);

        Assert.Equal((0, 1, 1), (beforeSix, atSix, again));
        Assert.DoesNotContain(api.NotificationEmails.Sent, e => e.Email.Subject.Contains("replied to you", StringComparison.Ordinal));
        var email = Assert.Single(Digests(api));
        Assert.Equal("ruth@example.com", email.To);
        Assert.Equal("Popkin", email.FromDisplayName);
        Assert.Equal("Your day in Popkin: 3 new things across 1 Popkin", email.Email.Subject);
        var text = email.Email.Text;
        Assert.Contains("Evening, Ruth", text);
        Assert.Contains("Everything since 6 pm yesterday", text);
        Assert.Contains("Lakeside Weekend · 3 new", text);
        var reply = text.IndexOf("Joel: “Put me down for the paddles & oars”", StringComparison.Ordinal);
        var direct = text.IndexOf("Mara: “Lunch after?”", StringComparison.Ordinal);
        var joined = text.IndexOf("Dev joined the Popkin", StringComparison.Ordinal);
        Assert.True(reply > 0 && direct > 0 && joined > 0 && Math.Max(reply, direct) < joined, text);
        Assert.Contains("Put me down for the paddles &amp; oars", email.Email.Html);
        Assert.Contains("Open Popkin: https://localhost/popkins", text);
        Assert.Contains("You’re getting one digest a day at 6 pm instead of an email per change. Reminders still arrive on time.", text);
        Assert.Contains("Mute a Popkin: https://localhost/account/notifications?tab=popkins", text);
    }

    // Given a story of Ruth's due tomorrow, when her digest is sent, then it opens with "1 thing
    // needs you" and the story, and the subject says so (L2-165 AC2).
    [Fact]
    public async Task What_needs_her_comes_first()
    {
        using var api = new ApiFactory();
        var day = Next(api);
        var lakeside = await RuthAskedAsync(api, day);
        var ruthsMembership = await lakeside.Ruth.MembershipIdAsync(lakeside.Popkin.Id);
        var added = await lakeside.Popkin.Host.AddStoryAsync(lakeside.Popkin.Id, "Book the cabin", ownerMembershipId: ruthsMembership);
        var story = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await lakeside.Popkin.Host.SaveStoryAsync(lakeside.Popkin.Id, story, "Book the cabin", tag: "Stay",
            ownerMembershipId: ruthsMembership, dueDate: day.AddDays(1).ToString("yyyy-MM-dd"))).EnsureSuccessStatusCode();
        await ThreeChangesAsync(api, lakeside);

        api.Clock.SetUtcNow(At(day, 18));
        await TickAsync(api);

        var email = Assert.Single(Digests(api));
        Assert.Equal("Your day in Popkin: 1 thing needs you", email.Email.Subject);
        var text = email.Email.Text;
        var card = text.IndexOf("1 thing needs you", StringComparison.Ordinal);
        Assert.True(card > 0 && card < text.IndexOf("Lakeside Weekend · ", StringComparison.Ordinal), text);
        Assert.Contains($"Book the cabin · Yours in Lakeside Weekend · due {day.AddDays(1).ToDateTime(TimeOnly.MinValue):ddd d MMM}", text);
    }

    // Given Ruth on "Weekly digest", when changes reach her on a Friday, then nothing goes that
    // evening, and on Sunday at 6 pm one weekly digest goes (L2-165 AC1, AC6).
    [Fact]
    public async Task The_weekly_digest_goes_on_Sunday()
    {
        using var api = new ApiFactory();
        var friday = Next(api, DayOfWeek.Friday);
        var lakeside = await RuthAskedAsync(api, friday, "WeeklyDigest");
        await ThreeChangesAsync(api, lakeside);

        api.Clock.SetUtcNow(At(friday, 18));
        var friday6 = await TickAsync(api);
        api.Clock.SetUtcNow(At(friday.AddDays(2), 18));
        var sunday6 = await TickAsync(api);

        Assert.Equal((0, 1), (friday6, sunday6));
        var email = Assert.Single(Digests(api));
        Assert.Equal("Your week in Popkin: 3 new things across 1 Popkin", email.Email.Subject);
        Assert.Contains("Everything since last Sunday", email.Email.Text);
        Assert.Contains("You’re getting one digest a week, on Sunday at 6 pm, instead of an email per change.", email.Email.Text);
    }

    // Given the only change was deleted before 6 pm, then no digest is sent (L2-165 AC5).
    [Fact]
    public async Task Nothing_new_sends_nothing()
    {
        using var api = new ApiFactory();
        var day = Next(api);
        var lakeside = await RuthAskedAsync(api, day);
        var posted = await lakeside.Joel.PostAsJsonAsync(
            $"/api/popkins/{lakeside.Popkin.Id}/threads/{lakeside.Everyone}/messages",
            new { clientMessageId = Guid.NewGuid(), text = "On it", replyToMessageId = lakeside.Asked });
        var reply = (await posted.Content.ReadFromJsonAsync<JsonElement>()).Id();
        await api.DispatchAsync();
        (await lakeside.Joel.DeleteAsync($"/api/popkins/{lakeside.Popkin.Id}/threads/{lakeside.Everyone}/messages/{reply}")).EnsureSuccessStatusCode();

        api.Clock.SetUtcNow(At(day, 18));
        await TickAsync(api);
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        Assert.Equal(0, await TickAsync(api));
    }
}
