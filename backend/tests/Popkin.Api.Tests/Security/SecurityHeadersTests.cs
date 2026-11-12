using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Security;

/// <summary>Responses carry the headers that protect personal data (L2-054 AC1).</summary>
public sealed class SecurityHeadersTests
{
    [Fact]
    public async Task Every_response_refuses_sniffing_framing_and_inline_script()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/health");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        var csp = response.Headers.GetValues("Content-Security-Policy").Single();
        Assert.Contains("default-src 'none'", csp);
        Assert.Contains("frame-ancestors 'none'", csp);
        Assert.DoesNotContain("unsafe-inline", csp);
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
    }

    [Fact]
    public async Task Answers_with_a_session_are_not_cached()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");

        var response = await client.GetAsync("/api/auth/session");

        Assert.True(response.Headers.CacheControl?.NoStore);
    }
}
