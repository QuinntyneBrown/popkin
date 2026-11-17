using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>
/// Holds: an Owner or Support stops every notification to one Popkin while it is looked into, and a
/// deleting account is held automatically (docs/detailed-designs/admin-platform/notification-holds,
/// L2-172).
/// </summary>
public sealed class NotificationHoldsTests
{
    // Given Support holds Lakeside with a reason, when a reply happens there, then its members get
    // no email, the hold is listed by them with the reason and counted on the page, and members are
    // not told; released with a reason, nothing held back is sent and the next reply is
    // (L2-172 AC1–AC4).
    [Fact]
    public async Task Support_holds_a_Popkin_and_releases_it()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (support, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        await api.DispatchAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();

        var held = await support.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = lakeside.Id, reason = "  Reported for spam invites  " });
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "On it");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        var holds = await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications/holds");
        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications");

        Assert.Equal(HttpStatusCode.Created, held.StatusCode);
        Assert.Empty(api.NotificationEmails.Sent);
        var hold = Assert.Single(holds.GetProperty("holds").EnumerateArray());
        Assert.Equal("Popkin", hold.GetProperty("target").GetString());
        Assert.False(hold.GetProperty("automatic").GetBoolean());
        Assert.Equal("Lakeside Weekend", hold.GetProperty("popkin").GetProperty("name").GetString());
        Assert.Equal(lakeside.Code, hold.GetProperty("popkin").GetProperty("inviteCode").GetString());
        Assert.Equal(2, hold.GetProperty("popkin").GetProperty("members").GetInt32());
        Assert.Equal("Reported for spam invites", hold.GetProperty("why").GetString());
        Assert.Equal("Sam", hold.GetProperty("byName").GetString());
        Assert.Equal("UntilReleased", hold.GetProperty("until").GetString());
        Assert.Equal(JsonValueKind.Null, holds.GetProperty("suppressedAddresses").ValueKind);
        Assert.Equal(1, page.GetProperty("holdCount").GetInt32());
        Assert.DoesNotContain("hold", (await ruth.GetStringAsync("/api/me/notifications")), StringComparison.OrdinalIgnoreCase);

        var holdId = hold.GetProperty("id").GetString();
        var released = await support.PostAsJsonAsync($"/api/admin/notifications/holds/{holdId}/release", new { reason = "Reports reviewed" });
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        Assert.Equal(HttpStatusCode.OK, released.StatusCode);
        Assert.Empty(api.NotificationEmails.Sent);
        Assert.Empty((await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications/holds")).GetProperty("holds").EnumerateArray());
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "Got two");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        Assert.Single(api.NotificationEmails.Sent);
        await (await support.PostAsJsonAsync($"/api/admin/notifications/holds/{holdId}/release", new { reason = "Again" }))
            .AssertProblem(HttpStatusCode.NotFound, "hold_not_found");

        var entries = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(["ReleasedNotificationHold", "HeldNotifications"], entries.Take(2).Select(e => e.GetProperty("action").GetString()));
        Assert.Equal("Lakeside Weekend", entries[1].GetProperty("targetName").GetString());
        Assert.Equal("Reported for spam invites", entries[1].GetProperty("reason").GetString());
    }

    // Given the "Hold a Popkin" search, when it searches, then it lists active Popkins by name or
    // invite code, leaving out one already held and one wrapped up; holding either is refused, as
    // is an unknown Popkin (L2-172 AC2).
    [Fact]
    public async Task Only_an_active_Popkin_not_held_can_be_found_and_held()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var lakeside = await api.StartLakesideAsync();
        var hornets = await api.StartPopkinAsync("Joel Ferreira", "(415) 555-0123", "U10 Hornets Parents");
        var brunch = await api.StartPopkinAsync("Ana Souza", "(415) 555-0177", "Sunday Brunch Club");
        (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = lakeside.Id, reason = "Spam" })).EnsureSuccessStatusCode();
        await brunch.Host.WrappedUpAsync(brunch.Id);

        var byCode = await owner.GetFromJsonAsync<JsonElement>($"/api/admin/notifications/holds/popkin-search?q={hornets.Code.ToLowerInvariant()}");
        var all = await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications/holds/popkin-search?q=u");

        var match = Assert.Single(byCode.EnumerateArray());
        Assert.Equal(hornets.Id, match.GetProperty("popkinId").GetGuid());
        Assert.Equal("U10 Hornets Parents", match.GetProperty("name").GetString());
        Assert.Equal(["U10 Hornets Parents"], all.EnumerateArray().Select(m => m.GetProperty("name").GetString()));
        await (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = lakeside.Id, reason = "Spam" }))
            .AssertProblem(HttpStatusCode.Conflict, "popkin_already_held");
        await (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = brunch.Id, reason = "Spam" }))
            .AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = Guid.NewGuid(), reason = "Spam" }))
            .AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = hornets.Id, reason = " " }))
            .AssertProblem(HttpStatusCode.BadRequest, "reason_required");
        await (await owner.PostAsJsonAsync($"/api/admin/notifications/holds/{Guid.NewGuid()}/release", new { reason = "Done" }))
            .AssertProblem(HttpStatusCode.NotFound, "hold_not_found");
    }

    // Given a Viewer, when they hold or release, then 403 `role_not_allowed`; they can still read
    // the holds (L2-086, L2-172).
    [Fact]
    public async Task A_viewer_cannot_hold_or_release()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");
        var lakeside = await api.StartLakesideAsync();
        var hold = await (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = lakeside.Id, reason = "Spam" }))
            .Content.ReadFromJsonAsync<JsonElement>();

        await (await viewer.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = lakeside.Id, reason = "Spam" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        await (await viewer.PostAsJsonAsync($"/api/admin/notifications/holds/{hold.GetProperty("id").GetString()}/release", new { reason = "Done" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        Assert.Single((await viewer.GetFromJsonAsync<JsonElement>("/api/admin/notifications/holds")).GetProperty("holds").EnumerateArray());
    }

    // Given a person deleting their account, when the holds are read, then they are held
    // automatically "Until deleted", by System, with no id to release, after every manual hold
    // (L2-172 AC5).
    [Fact]
    public async Task A_deleting_account_is_held_automatically()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var lakeside = await api.StartLakesideAsync();
        var hornets = await api.StartPopkinAsync("Joel Ferreira", "(415) 555-0123", "U10 Hornets Parents");
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        (await ruth.DeleteAsync("/api/account")).EnsureSuccessStatusCode();
        (await owner.PostAsJsonAsync("/api/admin/notifications/holds", new { popkinId = hornets.Id, reason = "Spam" })).EnsureSuccessStatusCode();

        var holds = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications/holds")).GetProperty("holds").EnumerateArray().ToList();

        Assert.Equal([false, true], holds.Select(h => h.GetProperty("automatic").GetBoolean()));
        var automatic = holds[1];
        Assert.Equal(JsonValueKind.Null, automatic.GetProperty("id").ValueKind);
        Assert.Equal("Person", automatic.GetProperty("target").GetString());
        Assert.Equal("Ruth Lindqvist", automatic.GetProperty("person").GetProperty("name").GetString());
        Assert.Equal("ruth@example.com", automatic.GetProperty("person").GetProperty("email").GetString());
        Assert.Equal("Account being deleted", automatic.GetProperty("why").GetString());
        Assert.Equal("System", automatic.GetProperty("byName").GetString());
        Assert.Equal("UntilDeleted", automatic.GetProperty("until").GetString());
        Assert.Equal(2, (await owner.GetFromJsonAsync<JsonElement>("/api/admin/notifications")).GetProperty("holdCount").GetInt32());
    }
}
