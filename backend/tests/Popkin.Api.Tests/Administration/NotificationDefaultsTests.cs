using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>
/// Notification defaults: what every member gets until they choose, set by an Owner with a reason
/// (docs/detailed-designs/admin-platform/notification-defaults, L2-173).
/// </summary>
public sealed class NotificationDefaultsTests
{
    private static object Defaults(
        string activityEmail = "AsItHappens",
        int bundleMinutes = 10,
        int mostEmailsPerDay = 12,
        string quietFrom = "21:00",
        string quietTo = "08:00",
        string birthdayLead = "OneWeekBefore",
        string? reason = "Fewer emails at launch") =>
        new { activityEmail, bundleMinutes, mostEmailsPerDay, quietFrom, quietTo, birthdayLead, reason };

    // Given nobody has changed them, when any admin opens Defaults, then they read the first
    // values of L2-161 and L2-173 AC2, changed by nobody yet.
    [Fact]
    public async Task Any_admin_reads_the_first_values()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");

        var read = await viewer.GetFromJsonAsync<JsonElement>("/api/admin/notifications/defaults");

        Assert.Equal("AsItHappens", read.GetProperty("activityEmail").GetString());
        Assert.Equal(10, read.GetProperty("bundleMinutes").GetInt32());
        Assert.Equal(12, read.GetProperty("mostEmailsPerDay").GetInt32());
        Assert.Equal("21:00", read.GetProperty("quietFrom").GetString());
        Assert.Equal("08:00", read.GetProperty("quietTo").GetString());
        Assert.Equal("OneWeekBefore", read.GetProperty("birthdayLead").GetString());
        Assert.Equal(JsonValueKind.Null, read.GetProperty("changedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, read.GetProperty("changedByName").ValueKind);
    }

    // Given an Owner saves a daily digest, a 5-minute bundle and birthdays off with a reason, then
    // the defaults read changed by them, the audit log holds each old and new value, a member who
    // never chose gets the daily digest while one who chose keeps theirs, and a new birthday
    // starts with its reminders off (L2-173 AC2, AC4, L2-139 AC4).
    [Fact]
    public async Task An_owner_changes_the_defaults_and_members_who_have_not_chosen_follow()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        (await lakeside.Host.PutAsJsonAsync("/api/me/notifications/frequency", new { frequency = "AsItHappens" })).EnsureSuccessStatusCode();

        var saved = await owner.PutAsJsonAsync("/api/admin/notifications/defaults",
            Defaults(activityEmail: "DailyDigest", bundleMinutes: 5, birthdayLead: "Off", reason: "  Fewer emails at launch  "));
        var contact = (await ruth.AddedContactAsync("Bea Fischer")).GetProperty("id").GetGuid();
        var today = DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime).AddDays(20);
        (await ruth.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
        {
            clientId = Guid.NewGuid(), kind = "Birthday", month = today.Month, day = today.Day, year = (int?)null, everyYear = true,
        })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var read = await saved.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("DailyDigest", read.GetProperty("activityEmail").GetString());
        Assert.Equal(5, read.GetProperty("bundleMinutes").GetInt32());
        Assert.Equal("Off", read.GetProperty("birthdayLead").GetString());
        Assert.Equal("Owner", read.GetProperty("changedByName").GetString());
        Assert.Equal(api.Clock.GetUtcNow(), read.GetProperty("changedAt").GetDateTimeOffset());
        Assert.Equal("DailyDigest", (await ruth.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("email").GetProperty("frequency").GetString());
        Assert.Equal("AsItHappens", (await lakeside.Host.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("email").GetProperty("frequency").GetString());
        var birthday = Assert.Single((await ruth.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("birthdays").EnumerateArray());
        Assert.False(birthday.GetProperty("remindersOn").GetBoolean());

        var entry = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0];
        Assert.Equal("ChangedNotificationDefaults", entry.GetProperty("action").GetString());
        Assert.Equal("Notification defaults", entry.GetProperty("targetName").GetString());
        Assert.Equal("Fewer emails at launch", entry.GetProperty("reason").GetString());
        var details = JsonDocument.Parse(entry.GetProperty("details").GetString()!).RootElement;
        Assert.Equal("AsItHappens", details.GetProperty("activityEmail").GetProperty("old").GetString());
        Assert.Equal("DailyDigest", details.GetProperty("activityEmail").GetProperty("new").GetString());
        Assert.Equal(5, details.GetProperty("bundleMinutes").GetProperty("new").GetInt32());
        Assert.False(details.TryGetProperty("mostEmailsPerDay", out _));
    }

    // Given a 3-minute bundle, when a reply is sent, then its email goes out 3 minutes after, not
    // 10 (L2-173 AC4, L2-161 AC3).
    [Fact]
    public async Task The_bundle_window_follows_the_default()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        (await owner.PutAsJsonAsync("/api/admin/notifications/defaults", Defaults(bundleMinutes: 3))).EnsureSuccessStatusCode();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        await api.DispatchAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Can someone grab the paddles?")).Id();
        await lakeside.Host.RepliedAsync(lakeside.Id, everyone, asked, "On it");
        await api.DispatchAsync();

        api.Clock.Advance(TimeSpan.FromMinutes(3));
        await api.DispatchAsync();

        Assert.Single(api.NotificationEmails.Sent);
    }

    // Each value outside the table is refused with `default_not_allowed` naming the field; saving
    // what is saved is `no_change` (L2-173 AC3).
    [Theory]
    [InlineData("bundleMinutes", "AsItHappens", 0, 12, "21:00", "08:00", "OneWeekBefore")]
    [InlineData("bundleMinutes", "AsItHappens", 61, 12, "21:00", "08:00", "OneWeekBefore")]
    [InlineData("mostEmailsPerDay", "AsItHappens", 10, 0, "21:00", "08:00", "OneWeekBefore")]
    [InlineData("mostEmailsPerDay", "AsItHappens", 10, 101, "21:00", "08:00", "OneWeekBefore")]
    [InlineData("quietFrom", "AsItHappens", 10, 12, "21:15", "08:00", "OneWeekBefore")]
    [InlineData("quietTo", "AsItHappens", 10, 12, "21:00", "8 am", "OneWeekBefore")]
    [InlineData("quietTo", "AsItHappens", 10, 12, "21:00", "21:00", "OneWeekBefore")]
    [InlineData("activityEmail", "Hourly", 10, 12, "21:00", "08:00", "OneWeekBefore")]
    [InlineData("birthdayLead", "AsItHappens", 10, 12, "21:00", "08:00", "TwoWeeksBefore")]
    public async Task A_value_outside_the_table_is_refused(
        string field, string activityEmail, int bundleMinutes, int mostEmailsPerDay, string quietFrom, string quietTo, string birthdayLead)
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var refused = await owner.PutAsJsonAsync("/api/admin/notifications/defaults",
            Defaults(activityEmail, bundleMinutes, mostEmailsPerDay, quietFrom, quietTo, birthdayLead));

        var problem = await refused.AssertProblem(HttpStatusCode.BadRequest, "default_not_allowed");
        Assert.Equal(field, problem.GetProperty("field").GetString());
    }

    // Nothing differs: `no_change`. A reason is required. Only an Owner saves (L2-173 AC3, AC4, L2-086).
    [Fact]
    public async Task Saving_is_refused_without_a_change_a_reason_or_the_role()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (support, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");

        await (await owner.PutAsJsonAsync("/api/admin/notifications/defaults", Defaults()))
            .AssertProblem(HttpStatusCode.BadRequest, "no_change");
        await (await owner.PutAsJsonAsync("/api/admin/notifications/defaults", Defaults(bundleMinutes: 15, reason: null)))
            .AssertProblem(HttpStatusCode.BadRequest, "reason_required");
        await (await support.PutAsJsonAsync("/api/admin/notifications/defaults", Defaults(bundleMinutes: 15)))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
    }
}
