using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>
/// The admin Notifications page: whether member email is going out, each kind's traffic, and an
/// Owner's pause and resume (docs/detailed-designs/admin-platform/notifications, L2-169, L2-170).
/// </summary>
public sealed class AdminNotificationsTests
{
    /// <summary>Ruth asks in Lakeside's Everyone and Mara replies: one email to Ruth, once the window ends.</summary>
    private static async Task<(StartedPopkin Lakeside, Guid Everyone, HttpClient Ruth)> RepliedToRuthAsync(ApiFactory api)
    {
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        await api.DispatchAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "On it");
        await api.DispatchAsync();
        return (lakeside, everyone, ruth);
    }

    // Given a reply emailed today, when any admin opens Notifications, then it says email is
    // sending, counts the email sent today and the kind's sends in 24 hours, lists the twelve kinds
    // in their three groups with "Sign-in codes and security" required, and names no person
    // (L2-169 AC1, AC2, AC4, AC6).
    [Fact]
    public async Task Any_admin_sees_whether_email_is_going_out_and_each_kinds_traffic()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");
        await RepliedToRuthAsync(api);
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();

        var page = await viewer.GetFromJsonAsync<JsonElement>("/api/admin/notifications");

        var status = page.GetProperty("status");
        Assert.False(status.GetProperty("paused").GetBoolean());
        Assert.Equal(1, status.GetProperty("sentToday").GetInt32());
        Assert.Equal(0, status.GetProperty("queued").GetInt32());
        Assert.Equal(JsonValueKind.Null, status.GetProperty("bouncedPercent").ValueKind);
        var groups = page.GetProperty("groups").EnumerateArray().ToList();
        Assert.Equal(["Activity", "Reminders", "Account"], groups.Select(g => g.GetProperty("group").GetString()));
        Assert.Equal([8, 3, 1], groups.Select(g => g.GetProperty("kinds").GetArrayLength()));
        var replies = groups[0].GetProperty("kinds")[0];
        Assert.Equal("Mentions and replies", replies.GetProperty("name").GetString());
        Assert.Equal(1, replies.GetProperty("sent24h").GetInt32());
        Assert.False(replies.GetProperty("offForEveryone").GetBoolean());
        var signIn = groups[2].GetProperty("kinds")[0];
        Assert.Equal("SignInAndSecurity", signIn.GetProperty("kind").GetString());
        Assert.True(signIn.GetProperty("required").GetBoolean());
        Assert.Equal(0, page.GetProperty("holdCount").GetInt32());
        Assert.DoesNotContain("ruth", page.GetRawText(), StringComparison.OrdinalIgnoreCase);
    }

    // Given email sending, when an Owner pauses it with a reason, then the status reads paused by
    // them with the reason, the audit log records it, a reply due now is queued and not sent, and
    // a second pause is 409; when they resume, it sends, and a second resume is 409 (L2-170 AC1–AC4).
    [Fact]
    public async Task An_owner_pauses_and_resumes_member_email()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        await RepliedToRuthAsync(api);

        var paused = await owner.PostAsJsonAsync("/api/admin/notifications/pause", new { reason = "  Digest sending twice  " });
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        var whilePaused = api.NotificationEmails.Sent.Count;
        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications");
        var again = await owner.PostAsJsonAsync("/api/admin/notifications/pause", new { reason = "Again" });
        var resumed = await owner.PostAsJsonAsync("/api/admin/notifications/resume", new { reason = "Fixed the digest" });
        await api.DispatchAsync();

        Assert.Equal(HttpStatusCode.OK, paused.StatusCode);
        var status = await paused.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(status.GetProperty("paused").GetBoolean());
        Assert.Equal("Owner", status.GetProperty("pausedByName").GetString());
        Assert.Equal("Digest sending twice", status.GetProperty("pauseReason").GetString());
        Assert.Equal(0, whilePaused);
        Assert.Equal(1, page.GetProperty("status").GetProperty("queued").GetInt32());
        Assert.Equal(1, page.GetProperty("status").GetProperty("resumeMinutes").GetInt32());
        await again.AssertProblem(HttpStatusCode.Conflict, "email_already_paused");
        Assert.Equal(HttpStatusCode.OK, resumed.StatusCode);
        Assert.False((await resumed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("paused").GetBoolean());
        Assert.Single(api.NotificationEmails.Sent);
        await (await owner.PostAsJsonAsync("/api/admin/notifications/resume", new { reason = "Again" }))
            .AssertProblem(HttpStatusCode.Conflict, "email_not_paused");

        var entries = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(["ResumedMemberEmail", "PausedMemberEmail"], entries.Take(2).Select(e => e.GetProperty("action").GetString()));
        Assert.Equal("Member email", entries[1].GetProperty("targetName").GetString());
        Assert.Equal("Digest sending twice", entries[1].GetProperty("reason").GetString());
    }

    // A pause or a resume needs a reason of at most 500 characters (L2-170 AC1, L2-087).
    [Theory]
    [InlineData(null, "reason_required")]
    [InlineData("   ", "reason_required")]
    [InlineData(501, "reason_too_long")]
    public async Task A_pause_needs_a_reason(object? reason, string code)
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var text = reason is int length ? new string('a', length) : (string?)reason;

        await (await owner.PostAsJsonAsync("/api/admin/notifications/pause", new { reason = text }))
            .AssertProblem(HttpStatusCode.BadRequest, code);
    }

    // Given Support or a Viewer, when they pause or resume, then 403 `role_not_allowed`; /me lets
    // an Owner manage and hold notifications, Support hold them only, a Viewer neither (L2-086,
    // L2-170 AC5).
    [Theory]
    [InlineData("Support", false, true)]
    [InlineData("Viewer", false, false)]
    public async Task Only_an_owner_pauses_member_email(string role, bool manages, bool holds)
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (admin, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", role);

        await (await admin.PostAsJsonAsync("/api/admin/notifications/pause", new { reason = "Testing" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        await (await admin.PostAsJsonAsync("/api/admin/notifications/resume", new { reason = "Testing" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");

        var allowed = (await admin.GetFromJsonAsync<JsonElement>("/api/admin/me")).GetProperty("allowed").EnumerateArray().Select(a => a.GetString()).ToList();
        Assert.Equal((manages, holds), (allowed.Contains("ManageNotifications"), allowed.Contains("HoldNotifications")));
        var ownerAllowed = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/me")).GetProperty("allowed").EnumerateArray().Select(a => a.GetString()).ToList();
        Assert.Contains("ManageNotifications", ownerAllowed);
        Assert.Contains("HoldNotifications", ownerAllowed);
    }
}
