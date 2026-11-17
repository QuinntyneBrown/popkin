using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Auth;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

// Traces to: L2-176, L2-117
/// <summary>
/// Limits: an Owner changes how long a sign-in lasts, with a reason, and every session follows
/// within a minute (docs/detailed-designs/admin-platform/limits, L2-176).
/// </summary>
public sealed class LimitsTests
{
    private static object Change(int value, string limit = "SessionDays", string? reason = "Shared tablets at the venue") =>
        new { changes = new[] { new { limit, value } }, reason };

    // Given nobody has changed it, when any admin opens Limits, then "Sign-in lasts" holds its
    // default of 365 days, at most 400, changed by nobody (L2-176 AC1, AC3).
    [Fact]
    public async Task Any_admin_reads_the_sign_in_length_at_its_default()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");

        var read = await viewer.GetFromJsonAsync<JsonElement>("/api/admin/limits");

        var session = Assert.Single(read.GetProperty("sessions").EnumerateArray());
        Assert.Equal("SessionDays", session.GetProperty("limit").GetString());
        Assert.Equal(365, session.GetProperty("value").GetInt32());
        Assert.Equal(365, session.GetProperty("defaultValue").GetInt32());
        Assert.Equal(400, session.GetProperty("maxValue").GetInt32());
        Assert.Equal("days", session.GetProperty("unit").GetString());
        Assert.Equal(JsonValueKind.Null, session.GetProperty("changedAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, session.GetProperty("changedByName").ValueKind);
    }

    // Given Mara is signed in, when an Owner saves a sign-in length of 7 days with a reason, then
    // Limits reads 7 changed by them, the audit log holds 365 → 7 days with the reason, Mara's next
    // use renews her for 7 days and 7 days unused end her session, and a new sign-in lasts 7 days
    // (L2-176 AC5, AC6, AC8).
    [Fact]
    public async Task An_owner_shortens_the_sign_in_length_and_every_session_follows()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var mara = api.CreateBrowserClient();
        await mara.SignUpAsync(api, "Mara", "(415) 555-0148");

        var saved = await owner.PutAsJsonAsync("/api/admin/limits", Change(7, reason: "  Shared tablets at the venue  "));

        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var session = Assert.Single((await saved.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("sessions").EnumerateArray());
        Assert.Equal(7, session.GetProperty("value").GetInt32());
        Assert.Equal(365, session.GetProperty("defaultValue").GetInt32());
        Assert.Equal("Owner", session.GetProperty("changedByName").GetString());
        Assert.Equal(api.Clock.GetUtcNow(), session.GetProperty("changedAt").GetDateTimeOffset());

        var entry = (await owner.GetFromJsonAsync<JsonElement>("/api/admin/audit")).GetProperty("entries")[0];
        Assert.Equal("ChangedLimits", entry.GetProperty("action").GetString());
        Assert.Equal("Sign-in lasts", entry.GetProperty("targetName").GetString());
        Assert.Equal("Shared tablets at the venue", entry.GetProperty("reason").GetString());
        var details = JsonDocument.Parse(entry.GetProperty("details").GetString()!).RootElement;
        Assert.Equal(365, details.GetProperty("old").GetInt32());
        Assert.Equal(7, details.GetProperty("new").GetInt32());
        Assert.Equal("days", details.GetProperty("unit").GetString());

        var used = await mara.GetAsync("/api/auth/session");
        Assert.Equal(HttpStatusCode.OK, used.StatusCode);
        Assert.Equal(api.Clock.GetUtcNow().AddDays(7), SessionLengthTests.SessionCookieExpiry(used));
        api.Clock.Advance(TimeSpan.FromDays(7));
        Assert.Equal(HttpStatusCode.Unauthorized, (await mara.GetAsync("/api/auth/session")).StatusCode);

        var joel = api.CreateBrowserClient();
        await joel.SignUpAsync(api, "Joel", "(415) 555-0199");
        api.Clock.Advance(TimeSpan.FromDays(6));
        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync("/api/auth/session")).StatusCode);
    }

    // Given a saved change, when the snapshot is up to 30 seconds old, then it is honoured within
    // the minute L2-176 AC6 allows: here the next request already reads it.
    [Fact]
    public async Task A_longer_sign_in_length_applies_at_the_next_use()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var mara = api.CreateBrowserClient();
        await mara.SignUpAsync(api, "Mara", "(415) 555-0148");
        (await owner.PutAsJsonAsync("/api/admin/limits", Change(400))).EnsureSuccessStatusCode();

        var used = await mara.GetAsync("/api/auth/session");

        Assert.Equal(api.Clock.GetUtcNow().AddDays(400), SessionLengthTests.SessionCookieExpiry(used));
    }

    // A sign-in length that is not a whole number from 1 to 400 is refused, naming the value
    // (L2-176 AC4); an unknown limit is refused too.
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(401)]
    public async Task A_sign_in_length_outside_1_to_400_is_refused(int value)
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();

        var refused = await owner.PutAsJsonAsync("/api/admin/limits", Change(value));

        var problem = await refused.AssertProblem(HttpStatusCode.BadRequest, "limit_not_allowed");
        Assert.Equal("changes[0].value", problem.GetProperty("field").GetString());
        var read = await owner.GetFromJsonAsync<JsonElement>("/api/admin/limits");
        Assert.Equal(365, read.GetProperty("sessions")[0].GetProperty("value").GetInt32());
    }

    // Nothing differs: `no_change`. A reason is required. An unknown limit is `limit_unknown`.
    // Only an Owner saves (L2-087 AC2, L2-176 AC7).
    [Fact]
    public async Task Saving_is_refused_without_a_change_a_reason_a_known_limit_or_the_role()
    {
        using var api = new ApiFactory();
        var owner = await api.SignedInOwnerAsync();
        var (support, _) = await api.SignedInAdminAsync(owner, "sam@popkin.app", "Support");
        var (viewer, _) = await api.SignedInAdminAsync(owner, "vic@popkin.app", "Viewer");

        await (await owner.PutAsJsonAsync("/api/admin/limits", Change(365)))
            .AssertProblem(HttpStatusCode.BadRequest, "no_change");
        await (await owner.PutAsJsonAsync("/api/admin/limits", Change(30, reason: " ")))
            .AssertProblem(HttpStatusCode.BadRequest, "reason_required");
        await (await owner.PutAsJsonAsync("/api/admin/limits", Change(30, limit: "SessionWeeks")))
            .AssertProblem(HttpStatusCode.BadRequest, "limit_unknown");
        await (await support.PutAsJsonAsync("/api/admin/limits", Change(30)))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
        await (await viewer.PutAsJsonAsync("/api/admin/limits", Change(30)))
            .AssertProblem(HttpStatusCode.Forbidden, "role_not_allowed");
    }

    // A person's own session gets nothing from the admin API, and no session gets 401 (L2-078 AC3).
    [Fact]
    public async Task A_popkin_session_cannot_read_or_change_limits()
    {
        using var api = new ApiFactory();
        var mara = api.CreateBrowserClient();
        await mara.SignUpAsync(api, "Mara", "(415) 555-0148");

        await (await mara.GetAsync("/api/admin/limits")).AssertProblem(HttpStatusCode.Forbidden, "admin_session_required");
        await (await mara.PutAsJsonAsync("/api/admin/limits", Change(30))).AssertProblem(HttpStatusCode.Forbidden, "admin_session_required");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync("/api/admin/limits")).StatusCode);
    }
}
