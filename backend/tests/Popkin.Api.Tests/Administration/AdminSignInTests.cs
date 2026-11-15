using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Administration;

/// <summary>
/// Signing in to the admin app with a code sent to a staff email (L2-088, L2-078 AC1–AC3, AC5).
/// The first Owner is named by `Admin:FirstOwner`, which `ApiFactory` sets to `owner@popkin.app`.
/// </summary>
public sealed class AdminSignInTests
{
    // Given the first Owner named by configuration, when they ask for a code and confirm it,
    // then the answer names them as an Owner, sets the admin cookie with the rules of L2-007 AC4,
    // and GET /api/admin/me answers with the same admin.
    [Fact]
    public async Task The_first_owner_signs_in_with_a_code()
    {
        using var api = new ApiFactory();
        var console = api.CreateBrowserClient();

        var verificationId = await console.RequestAdminCodeAsync("Owner@Popkin.app");
        var response = await console.PostAsJsonAsync(
            $"/api/admin/auth/codes/{verificationId}/confirm",
            new { code = api.Codes.LastCodeFor("owner@popkin.app") });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var signedIn = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("owner@popkin.app", signedIn.GetProperty("email").GetString());
        Assert.Equal("Owner", signedIn.GetProperty("role").GetString());
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-popkin-admin=", StringComparison.Ordinal));
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", cookie, StringComparison.OrdinalIgnoreCase);

        var me = await console.GetFromJsonAsync<JsonElement>("/api/admin/me");
        Assert.Equal("owner@popkin.app", me.GetProperty("email").GetString());
        Assert.Equal("Owner", me.GetProperty("role").GetString());
    }

    // Given an email that is not an admin's, when a code is asked for, then it is sent as for an
    // admin (L2-088 AC3); when it is confirmed, then 403 not_an_admin and no admin cookie (L2-078 AC2).
    [Fact]
    public async Task A_person_who_is_not_an_admin_gets_no_session()
    {
        using var api = new ApiFactory();
        var console = api.CreateBrowserClient();

        var request = await console.PostAsJsonAsync("/api/admin/auth/codes", new { email = "mara@example.com" });
        Assert.Equal(HttpStatusCode.OK, request.StatusCode);
        var verificationId = (await request.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("verificationId").GetGuid();

        var response = await console.PostAsJsonAsync(
            $"/api/admin/auth/codes/{verificationId}/confirm",
            new { code = api.Codes.LastCodeFor("mara@example.com") });

        await response.AssertProblem(HttpStatusCode.Forbidden, "not_an_admin");
        Assert.False(response.Headers.TryGetValues("Set-Cookie", out var cookies) && cookies.Any(c => c.StartsWith("__Host-popkin-admin=", StringComparison.Ordinal)));
        Assert.Equal(HttpStatusCode.Unauthorized, (await console.GetAsync("/api/admin/me")).StatusCode);
    }

    // Given a request to an admin endpoint, when it carries no session, then 401; when it carries
    // a Popkin app session only, then 403 admin_session_required (L2-078 AC3).
    [Fact]
    public async Task Admin_endpoints_refuse_callers_without_an_admin_session()
    {
        using var api = new ApiFactory();

        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync("/api/admin/me")).StatusCode);

        var member = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var response = await member.GetAsync("/api/admin/me");
        await response.AssertProblem(HttpStatusCode.Forbidden, "admin_session_required");
    }

    // Given an admin's email, when three wrong codes are entered, then the first two say how many
    // tries are left and the third locks the console for 15 minutes; a correct code is refused
    // while it is locked, and a new code cannot be asked for; after 15 minutes a new code signs in
    // (L2-088 AC5, AC6).
    [Fact]
    public async Task Three_wrong_codes_lock_the_console_for_15_minutes()
    {
        using var api = new ApiFactory();
        var console = api.CreateBrowserClient();
        var verificationId = await console.RequestAdminCodeAsync("owner@popkin.app");
        var url = $"/api/admin/auth/codes/{verificationId}/confirm";

        var first = await (await console.PostAsJsonAsync(url, new { code = "000000" })).AssertProblem(HttpStatusCode.BadRequest, "code_mismatch");
        Assert.Equal(2, first.GetProperty("attemptsLeft").GetInt32());
        var second = await (await console.PostAsJsonAsync(url, new { code = "000000" })).AssertProblem(HttpStatusCode.BadRequest, "code_mismatch");
        Assert.Equal(1, second.GetProperty("attemptsLeft").GetInt32());
        var locked = await (await console.PostAsJsonAsync(url, new { code = "000000" })).AssertProblem(HttpStatusCode.TooManyRequests, "admin_locked");
        Assert.Equal(api.Clock.GetUtcNow().AddMinutes(15), locked.GetProperty("lockedUntil").GetDateTimeOffset());

        await (await console.PostAsJsonAsync(url, new { code = api.Codes.LastCodeFor("owner@popkin.app") }))
            .AssertProblem(HttpStatusCode.TooManyRequests, "admin_locked");
        await (await console.PostAsJsonAsync("/api/admin/auth/codes", new { email = "owner@popkin.app" }))
            .AssertProblem(HttpStatusCode.TooManyRequests, "admin_locked");

        api.Clock.Advance(TimeSpan.FromMinutes(15));
        var again = await console.RequestAdminCodeAsync("owner@popkin.app");
        var signedIn = await console.PostAsJsonAsync($"/api/admin/auth/codes/{again}/confirm", new { code = api.Codes.LastCodeFor("owner@popkin.app") });
        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
    }

    // Given an admin signed in to the console and to the Popkin app in one browser, when they sign
    // out of the console, then the admin session ends and the Popkin app session is kept
    // (L2-088 AC8, L2-078 AC5).
    [Fact]
    public async Task Signing_out_of_the_console_keeps_the_popkin_app_session()
    {
        using var api = new ApiFactory();
        var browser = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        await browser.SignInAsAdminAsync(api, "owner@popkin.app");

        var response = await browser.PostAsync("/api/admin/auth/sign-out", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-popkin-admin=;", StringComparison.Ordinal));
        await (await browser.GetAsync("/api/admin/me")).AssertProblem(HttpStatusCode.Forbidden, "admin_session_required");
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/auth/session")).StatusCode);
    }

    // Given a code sent for the admin app, when it is confirmed or resent through the Popkin
    // app's endpoints, then it is refused, and the Popkin app cannot ask for one either: a code
    // works only where it was asked for.
    [Fact]
    public async Task An_admin_code_does_not_work_in_the_popkin_app()
    {
        using var api = new ApiFactory();
        var browser = api.CreateBrowserClient();
        var verificationId = await browser.RequestAdminCodeAsync("owner@popkin.app");

        await (await browser.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code = api.Codes.LastCodeFor("owner@popkin.app"), name = "Owner" }))
            .AssertProblem(HttpStatusCode.BadRequest, "code_expired");
        api.Clock.Advance(TimeSpan.FromSeconds(30));
        await (await browser.PostAsync($"/api/auth/codes/{verificationId}/resend", null))
            .AssertProblem(HttpStatusCode.BadRequest, "verification_unknown");
        await (await browser.PostAsJsonAsync("/api/auth/codes", new { purpose = "AdminSignIn", channel = "Email", destination = "owner@popkin.app" }))
            .AssertProblem(HttpStatusCode.BadRequest, "purpose_invalid");
    }
}
