using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The changes of the Popkin update other than messages (popkin-update-email, "The four
/// changes"; L2-164 AC2 to AC4), and what becomes of an email that cannot be sent (L2-175 AC2,
/// L2-170).
/// </summary>
public sealed class UpdateEmailVariantTests
{
    private static readonly DateTimeOffset Wednesday = new(2027, 2, 17, 12, 0, 0, TimeSpan.Zero);

    private sealed record Lakeside(StartedPopkin Popkin, HttpClient Ruth, HttpClient Joel);

    /// <summary>Ruth, by email, and Joel in Lakeside at noon; what joining told anyone is sent.</summary>
    private static async Task<Lakeside> LakesideAsync(ApiFactory api)
    {
        api.Clock.SetUtcNow(Wednesday);
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        await WindowEndsAsync(api);
        api.NotificationEmails.Clear();
        return new Lakeside(lakeside, ruth, joel);
    }

    private static async Task WindowEndsAsync(ApiFactory api)
    {
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
    }

    // When Joel adds two photos, one with a caption, then Ruth's email says so, shows the caption,
    // and carries both pictures inline (L2-164 AC2).
    [Fact]
    public async Task Photos_are_counted_captioned_and_carried_inline()
    {
        using var api = new ApiFactory();
        var (lakeside, _, joel) = await LakesideAsync(api);

        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg), "First light on the dock");
        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await WindowEndsAsync(api);

        var email = Assert.Single(api.NotificationEmails.Sent).Email;
        Assert.Equal("Joel added 2 photos in Lakeside Weekend", email.Subject);
        Assert.Contains("Joel added 2 photos to the album", email.Html);
        Assert.Contains("First light on the dock", email.Text);
        Assert.Contains($"https://localhost/p/{lakeside.Id}/photos", email.Text);
        Assert.Equal(2, email.InlineImages.Count);
        Assert.All(email.InlineImages, image => Assert.Contains($"cid:{image.ContentId}", email.Html));
    }

    // When Mara gives Ruth a story with a due date, then Ruth's email says "Mara changed the plan"
    // and marks the story "Yours now" with its due date (L2-164 AC3).
    [Fact]
    public async Task A_story_given_to_the_recipient_is_yours_now()
    {
        using var api = new ApiFactory();
        var (lakeside, ruth, _) = await LakesideAsync(api);
        var story = (await (await lakeside.Host.AddStoryAsync(lakeside.Id, "Book the cabin")).Content.ReadFromJsonAsync<JsonElement>()).Id();
        await WindowEndsAsync(api);
        api.NotificationEmails.Clear();

        (await lakeside.Host.SaveStoryAsync(lakeside.Id, story, "Book the cabin", ownerMembershipId: await ruth.MembershipIdAsync(lakeside.Id), dueDate: "2027-02-19")).EnsureSuccessStatusCode();
        await WindowEndsAsync(api);

        var email = Assert.Single(api.NotificationEmails.Sent).Email;
        Assert.Equal("Mara changed the plan in Lakeside Weekend", email.Subject);
        Assert.Contains("Book the cabin", email.Text);
        Assert.Contains("Yours now", email.Text);
        Assert.Contains("due Fri 19 Feb", email.Text);
        Assert.Contains("Open the plan", email.Html);
    }

    // When Ben joins on Mara's invite, then Ruth's email comes from "Popkin", says who invited him
    // and how many people that makes, and offers to say hi (L2-164 AC4).
    [Fact]
    public async Task Someone_joining_is_introduced()
    {
        using var api = new ApiFactory();
        var (lakeside, _, _) = await LakesideAsync(api);

        await api.JoinedAsync(lakeside.Code, "Ben Okafor", "(415) 555-0177");
        await WindowEndsAsync(api);

        var message = Assert.Single(api.NotificationEmails.Sent, m => m.To == "ruth@example.com");
        Assert.Equal("Popkin", message.FromDisplayName);
        Assert.Equal("Ben joined Lakeside Weekend", message.Email.Subject);
        Assert.Contains("Invited by Mara", message.Email.Text);
        Assert.Contains("That makes 4 people", message.Email.Text);
        Assert.Contains("Say hi to Ben", message.Email.Html);
    }

    // When Mara books time off, then Ruth's email says so and opens Schedules.
    [Fact]
    public async Task Time_off_is_told()
    {
        using var api = new ApiFactory();
        var (lakeside, _, _) = await LakesideAsync(api);
        var mara = await lakeside.Host.MembershipIdAsync(lakeside.Id);

        (await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/schedule/time-off/{mara}",
            new { week = "2027-02-22", days = new[] { "Off", "Working", "Working", "Working", "Working" } })).EnsureSuccessStatusCode();
        await WindowEndsAsync(api);

        var email = Assert.Single(api.NotificationEmails.Sent).Email;
        Assert.Equal("Mara booked time off in Lakeside Weekend", email.Subject);
        Assert.Contains($"https://localhost/p/{lakeside.Id}/schedule", email.Text);
    }

    // When Ruth asked for experiences by email and Joel shares one, then her email names it.
    [Fact]
    public async Task An_experience_is_named()
    {
        using var api = new ApiFactory();
        var (lakeside, ruth, joel) = await LakesideAsync(api);
        (await ruth.PutAsJsonAsync("/api/me/notifications/kinds/Experiences", new { email = true })).EnsureSuccessStatusCode();

        await joel.SharedExperienceAsync(lakeside.Id, "Sunset paddle");
        await WindowEndsAsync(api);

        var email = Assert.Single(api.NotificationEmails.Sent).Email;
        Assert.Equal("Joel added Sunset paddle in Lakeside Weekend", email.Subject);
        Assert.Contains("Open Experiences", email.Html);
    }

    // A passing failure is tried again on the backoff, 30 s then 2 min, and sent; one that keeps
    // failing is dropped six hours after it fell due (L2-175 AC2).
    [Fact]
    public async Task A_passing_failure_is_retried_on_the_backoff_and_dropped_after_six_hours()
    {
        using var api = new ApiFactory();
        var (lakeside, _, joel) = await LakesideAsync(api);
        api.NotificationEmails.Answers.Enqueue(new EmailSendResult.Transient("status_503"));
        api.NotificationEmails.Answers.Enqueue(new EmailSendResult.Transient("status_503"));

        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await WindowEndsAsync(api);
        api.Clock.Advance(TimeSpan.FromSeconds(29));
        await api.DispatchAsync();
        var afterTwentyNineSeconds = api.NotificationEmails.Attempts;
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(2));
        await api.DispatchAsync();

        Assert.Equal(1, afterTwentyNineSeconds);
        Assert.Equal(3, api.NotificationEmails.Attempts);
        Assert.Single(api.NotificationEmails.Sent);

        // A second email that never goes through is dropped at six hours.
        for (var i = 0; i < 20; i++)
        {
            api.NotificationEmails.Answers.Enqueue(new EmailSendResult.Transient("status_503"));
        }

        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await WindowEndsAsync(api);
        for (var hour = 0; hour < 7; hour++)
        {
            api.Clock.Advance(TimeSpan.FromHours(1));
            await api.DispatchAsync();
        }

        Assert.Equal(OutgoingEmailStatus.Dropped, Emails(api).OrderBy(e => e.OpenedAt).Last().Status);
        Assert.Single(api.NotificationEmails.Sent);
    }

    // A refused address is not tried again.
    [Fact]
    public async Task A_permanent_failure_is_not_retried()
    {
        using var api = new ApiFactory();
        var (lakeside, _, joel) = await LakesideAsync(api);
        api.NotificationEmails.Answers.Enqueue(new EmailSendResult.Permanent("status_400"));

        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await WindowEndsAsync(api);
        api.Clock.Advance(TimeSpan.FromHours(1));
        await api.DispatchAsync();

        Assert.Equal(1, api.NotificationEmails.Attempts);
        Assert.Equal(OutgoingEmailStatus.Failed, Emails(api).OrderBy(e => e.OpenedAt).Last().Status);
    }

    // A sender that throws stops that email only: the next person's is still sent, and the
    // throwing one is tried again (L2-175 AC2).
    [Fact]
    public async Task A_sender_that_throws_stops_one_email_only()
    {
        using var api = new ApiFactory();
        var (lakeside, _, joel) = await LakesideAsync(api);
        await api.JoinedByEmailAsync(lakeside.Code, "Ben Okafor", "ben@example.com");
        await WindowEndsAsync(api);
        api.NotificationEmails.Clear();
        api.NotificationEmails.ThrowOnce = true;

        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        await WindowEndsAsync(api);

        Assert.Single(api.NotificationEmails.Sent);
        api.Clock.Advance(TimeSpan.FromSeconds(30));
        await api.DispatchAsync();
        Assert.Equal(["ben@example.com", "ruth@example.com"], api.NotificationEmails.Sent.Select(m => m.To).Order());
    }

    // While member email is paused, emails wait and phone alerts go on; on resume the waiting
    // email is sent, and one due more than six hours ago is dropped (L2-170 AC2, AC3).
    [Fact]
    public async Task Paused_email_waits_and_is_sent_on_resume()
    {
        using var api = new ApiFactory();
        var (lakeside, ruth, joel) = await LakesideAsync(api);
        await ruth.AllowsAlertsAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Paddles?")).Id();
        Platform(api, p => p.PauseEmail(Guid.NewGuid(), "Bounce rate", api.Clock.GetUtcNow()));

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Mine");
        await WindowEndsAsync(api);
        var whilePaused = api.NotificationEmails.Attempts;
        Platform(api, p => p.ResumeEmail());
        await api.DispatchAsync();

        Assert.Equal(0, whilePaused);
        Assert.Single(api.PhoneAlerts.Sent);
        Assert.Single(api.NotificationEmails.Sent);

        Platform(api, p => p.PauseEmail(Guid.NewGuid(), "Bounce rate", api.Clock.GetUtcNow()));
        await joel.RepliedAsync(lakeside.Id, everyone, asked, "And the oars");
        await WindowEndsAsync(api);
        api.Clock.Advance(TimeSpan.FromHours(7));
        await api.DispatchAsync();
        Platform(api, p => p.ResumeEmail());
        await api.DispatchAsync();

        Assert.Single(api.NotificationEmails.Sent);
        Assert.Equal(OutgoingEmailStatus.Dropped, Emails(api).OrderBy(e => e.OpenedAt).Last().Status);
    }

    private static List<OutgoingEmail> Emails(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().OutgoingEmails.ToList();
    }

    /// <summary>Changes the platform's notification controls, as the admin app will (L2-170).</summary>
    private static void Platform(ApiFactory api, Action<NotificationPlatform> change)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var platform = db.NotificationPlatforms.SingleOrDefault();
        if (platform is null)
        {
            platform = NotificationPlatform.Defaults();
            db.NotificationPlatforms.Add(platform);
        }

        change(platform);
        db.SaveChanges();
    }
}
