using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Administration;

/// <summary>
/// The Features page of the admin app: each feature is Off, on for chosen Popkins or on for
/// everyone, and the API honours the change at its next request (L2-076, L2-077, ADR 0024).
/// </summary>
public sealed class FeatureSwitchesTests
{
    // Given an admin, when Features opens, then it lists Plan and Schedules with their setting,
    // where each is on and who set it when (L2-076 AC1).
    [Fact]
    public async Task The_page_lists_Plan_and_Schedules_with_their_setting()
    {
        using var api = new ApiFactory();
        await api.StartLakesideAsync();
        var owner = await api.SignedInOwnerAsync();

        var page = await owner.GetFromJsonAsync<JsonElement>("/api/admin/features");

        var features = page.GetProperty("features").EnumerateArray().ToList();
        Assert.Equal(["Plan", "Schedules"], features.Select(f => f.GetProperty("feature").GetString()));
        // ApiFactory turns both on for everyone, as `popkin seed` does locally.
        Assert.Equal("Everyone", features[0].GetProperty("mode").GetString());
        Assert.Equal("Popkin", features[0].GetProperty("changedByName").GetString());
        Assert.Equal("Everyone", features[1].GetProperty("mode").GetString());
        Assert.Equal(1, features[1].GetProperty("livePopkins").GetInt32());
        Assert.Empty(features[1].GetProperty("chosen").EnumerateArray());
    }

    // Given Schedules on for everyone, when an Owner turns it off, then the next request for its
    // data is refused with 404 `feature_off`, the header has no Schedule tab, and the page says who
    // turned it off; turned on again, every entry is as it was (L2-076 AC7, AC10, L2-077 AC1, AC3, AC5).
    [Fact]
    public async Task An_owner_turns_Schedules_off_and_the_API_honours_it_at_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var owner = await api.SignedInOwnerAsync();
        var me = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        (await lakeside.Host.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/schedule/time-off/{me}", new { week = "2027-02-15", days = new[] { "Off", "Tentative", "Working", "Working", "Working" } }))
            .EnsureSuccessStatusCode();

        var off = await owner.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Off", reason = "Rolling back" });

        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        var saved = await off.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Off", saved.GetProperty("mode").GetString());
        Assert.Equal("Owner", saved.GetProperty("changedByName").GetString());
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15"))
            .AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.False((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("schedules").GetBoolean());

        (await owner.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Everyone" })).EnsureSuccessStatusCode();
        var week = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15");
        Assert.Contains("Tentative", week.GetRawText());
    }

    // Given Schedules on for chosen Popkins, when a chosen Popkin is used, then it has Schedules;
    // any other Popkin is refused; removed from the list, the chosen Popkin is refused too (L2-077 AC7, AC8).
    [Fact]
    public async Task Chosen_Popkins_have_the_feature_and_every_other_Popkin_does_not()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var hornets = await api.StartPopkinAsync("Joel Ferreira", "(415) 555-0123", "U10 Hornets Parents");
        var owner = await api.SignedInOwnerAsync();

        (await owner.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Chosen" })).EnsureSuccessStatusCode();
        var added = await owner.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = lakeside.Id });

        Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        var chosen = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("chosen");
        Assert.Equal("Lakeside Weekend", Assert.Single(chosen.EnumerateArray()).GetProperty("name").GetString());
        Assert.True((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("schedules").GetBoolean());
        Assert.False((await hornets.Host.HomeAsync(hornets.Id)).GetProperty("schedules").GetBoolean());
        await (await hornets.Host.GetAsync($"/api/popkins/{hornets.Id}/schedule/time-off?week=2027-02-15"))
            .AssertProblem(HttpStatusCode.NotFound, "feature_off");

        (await owner.DeleteAsync($"/api/admin/features/Schedules/popkins/{lakeside.Id}")).EnsureSuccessStatusCode();
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/schedule/time-off?week=2027-02-15"))
            .AssertProblem(HttpStatusCode.NotFound, "feature_off");
    }

    // Given the add dialog, when it searches, then it lists live Popkins by name or invite code and
    // marks one that has the feature; a wrapped-up Popkin is not listed and cannot be added (L2-076 AC6).
    [Fact]
    public async Task Only_a_live_Popkin_can_be_found_and_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var hornets = await api.StartPopkinAsync("Joel Ferreira", "(415) 555-0123", "U10 Hornets Parents");
        var owner = await api.SignedInOwnerAsync();
        (await owner.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = lakeside.Id })).EnsureSuccessStatusCode();

        var byName = await owner.GetFromJsonAsync<JsonElement>("/api/admin/features/Schedules/popkins/search?q=lake");
        var byCode = await owner.GetFromJsonAsync<JsonElement>($"/api/admin/features/Schedules/popkins/search?q={hornets.Code.ToLowerInvariant()}");

        var lake = Assert.Single(byName.EnumerateArray());
        Assert.True(lake.GetProperty("alreadyOn").GetBoolean());
        Assert.Equal(lakeside.Code, lake.GetProperty("inviteCode").GetString());
        Assert.Equal("U10 Hornets Parents", Assert.Single(byCode.EnumerateArray()).GetProperty("name").GetString());

        await hornets.Host.WrappedUpAsync(hornets.Id);
        Assert.Empty((await owner.GetFromJsonAsync<JsonElement>("/api/admin/features/Schedules/popkins/search?q=hornets")).EnumerateArray());
        await (await owner.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = hornets.Id }))
            .AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await owner.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = lakeside.Id }))
            .AssertProblem(HttpStatusCode.Conflict, "feature_popkin_already_chosen");
    }

    // Given a Support or Viewer admin, when they change a switch, then 403 `role_not_allowed`;
    // they can still read the page (L2-076 AC12, L2-086 AC1).
    [Theory]
    [InlineData("Support")]
    [InlineData("Viewer")]
    public async Task Only_an_owner_changes_a_switch(string role)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var owner = await api.SignedInOwnerAsync();
        var (admin, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", role);

        await (await admin.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Off" }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        await (await admin.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = lakeside.Id }))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");

        var page = await admin.GetFromJsonAsync<JsonElement>("/api/admin/features");
        Assert.Equal("Everyone", page.GetProperty("features")[1].GetProperty("mode").GetString());
    }

    // Given a setting is changed, when it is saved, then the audit log records the admin, the
    // feature, the old and new setting, the Popkins chosen and the reason; choosing the setting a
    // switch already has records nothing (L2-076 AC11, L2-120).
    [Fact]
    public async Task Each_change_is_in_the_audit_log_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var owner = await api.SignedInOwnerAsync();

        (await owner.PostAsJsonAsync("/api/admin/features/Schedules/popkins", new { popkinId = lakeside.Id })).EnsureSuccessStatusCode();
        (await owner.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Chosen", reason = "  Trying it with one group  " })).EnsureSuccessStatusCode();
        (await owner.PutAsJsonAsync("/api/admin/features/Schedules", new { mode = "Chosen" })).EnsureSuccessStatusCode();

        var entries = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(["LimitedFeatureToChosen", "AddedFeaturePopkin"], entries.Take(2).Select(e => e.GetProperty("action").GetString()));
        var limited = entries[0];
        Assert.Equal("Schedules", limited.GetProperty("targetName").GetString());
        Assert.Equal("Trying it with one group", limited.GetProperty("reason").GetString());
        var details = limited.GetProperty("details").GetRawText();
        Assert.Contains("Everyone", details);
        Assert.Contains("Chosen", details);
        Assert.Contains("Lakeside Weekend", details);
    }

    // Given an unknown feature or mode, when it is sent, then 404 `feature_not_found` or 400
    // `mode_not_allowed`.
    [Fact]
    public async Task An_unknown_feature_or_mode_is_refused()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        await (await owner.PutAsJsonAsync("/api/admin/features/Chat", new { mode = "Off" }))
            .AssertProblem(HttpStatusCode.NotFound, "feature_not_found");
        await (await owner.PutAsJsonAsync("/api/admin/features/Plan", new { mode = "Sometimes" }))
            .AssertProblem(HttpStatusCode.BadRequest, "mode_not_allowed");
    }

    // Given a switch changed in the database by another way than this API, when 30 seconds have
    // passed, then the API honours it, with no release and no restart (L2-076 AC10).
    [Fact]
    public async Task A_change_made_elsewhere_is_honoured_within_30_seconds()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        Assert.True((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("schedules").GetBoolean());
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.FeatureSettings.Single(s => s.Feature == Feature.Schedules).ChangeMode(FeatureMode.Off, null, "Popkin", api.Clock.GetUtcNow());
            await db.SaveChangesAsync();
        }

        Assert.True((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("schedules").GetBoolean());
        api.Clock.Advance(TimeSpan.FromSeconds(31));
        Assert.False((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("schedules").GetBoolean());
    }

    // Given a member, when their open screen reads the Popkin's features, then it says which are on
    // for this Popkin; a stranger learns nothing (L2-076 AC10, L2-077 AC4).
    [Fact]
    public async Task A_member_reads_the_features_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await api.SwitchFeatureAsync(Feature.Plan, FeatureMode.Off);

        var features = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/features");
        var refused = await stranger.GetAsync($"/api/popkins/{lakeside.Id}/features");

        Assert.False(features.GetProperty("plan").GetBoolean());
        Assert.True(features.GetProperty("schedules").GetBoolean());
        Assert.False((await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("plan").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, refused.StatusCode);
    }
}
