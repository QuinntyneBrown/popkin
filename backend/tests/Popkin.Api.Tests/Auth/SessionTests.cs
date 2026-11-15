using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Auth;

/// <summary>Sessions and what needs one (L2-007 AC1, L2-050).</summary>
public sealed class SessionTests
{
    [Fact]
    public async Task Without_a_session_a_private_endpoint_answers_401()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task The_anonymous_endpoints_answer_without_a_session()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignUp", channel = "Phone", destination = "(415) 555-0148" })).StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync($"/api/auth/codes/{Guid.NewGuid()}/confirm", new { code = "000000" })).StatusCode);
        Assert.NotEqual(HttpStatusCode.Unauthorized, (await client.PostAsync($"/api/auth/codes/{Guid.NewGuid()}/resend", null)).StatusCode);
    }

    [Fact]
    public async Task A_session_still_works_within_thirty_days()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromDays(29));

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task A_session_ends_after_thirty_days()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromDays(30));

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_revoked_session_stops_working_at_once()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        using (var scope = api.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            foreach (var session in db.Sessions)
            {
                session.Revoke(api.Clock.GetUtcNow());
            }

            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_change_from_another_site_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "cross-site");

        var response = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignUp", channel = "Phone", destination = "(415) 555-0148" });

        await response.AssertProblem(HttpStatusCode.Forbidden, "cross_site_request");
        Assert.Empty(api.Codes.Sent);
    }

    // Given a client that sends no fetch metadata, when the admin app's origin sends a change to
    // the admin API, then it is accepted; to the rest of the API it is another site (ADR 0024).
    [Fact]
    public async Task Without_fetch_metadata_the_admin_origin_may_change_only_the_admin_api()
    {
        using var api = new ApiFactory();
        api.Settings["Admin:Origin"] = "https://admin.localhost";
        var client = api.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("Origin", "https://admin.localhost");

        var admin = await client.PostAsJsonAsync("/api/admin/auth/codes", new { email = "owner@popkin.app" });
        var app = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignUp", channel = "Phone", destination = "(415) 555-0148" });

        Assert.Equal(HttpStatusCode.OK, admin.StatusCode);
        await app.AssertProblem(HttpStatusCode.Forbidden, "cross_site_request");
    }

    [Fact]
    public async Task Without_fetch_metadata_a_change_needs_the_app_origin()
    {
        using var api = new ApiFactory();
        var client = api.CreateClient(new() { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add("Origin", "https://evil.example");

        var refused = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignUp", channel = "Phone", destination = "(415) 555-0148" });
        client.DefaultRequestHeaders.Remove("Origin");
        client.DefaultRequestHeaders.Add("Origin", "https://localhost");
        var accepted = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignUp", channel = "Phone", destination = "(415) 555-0148" });

        await refused.AssertProblem(HttpStatusCode.Forbidden, "cross_site_request");
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
    }
}
