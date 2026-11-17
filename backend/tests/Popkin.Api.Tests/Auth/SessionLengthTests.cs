using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

// Traces to: L2-176, L2-007
/// <summary>
/// A sign-in lasts while it is used: each use starts the sign-in length again, 365 days unless an
/// Owner changes it (docs/detailed-designs/accounts/sessions, L2-176 AC1, AC2).
/// </summary>
public sealed class SessionLengthTests
{
    // Given Mara signed in, when she comes back 364 days later, then she is still signed in.
    [Fact]
    public async Task A_session_still_works_within_the_sign_in_length()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromDays(364));

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // Given Mara signed in, when 365 days pass without a use, then her session has ended.
    [Fact]
    public async Task A_session_unused_for_the_whole_sign_in_length_ends()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromDays(365));

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // Given Mara uses Popkin every 300 days, when two years have passed since she signed in, then
    // she is still signed in, and each use sent a cookie that expires 365 days after it.
    [Fact]
    public async Task Each_use_starts_the_sign_in_length_again()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");

        for (var use = 0; use < 3; use++)
        {
            api.Clock.Advance(TimeSpan.FromDays(300));
            var response = await client.GetAsync("/api/auth/session");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(api.Clock.GetUtcNow().AddDays(365), SessionCookieExpiry(response));
        }
    }

    // Given Mara used Popkin a minute ago, when she uses it again, then no new cookie is sent:
    // a device renews its session at most once an hour.
    [Fact]
    public async Task A_session_used_again_within_the_hour_is_not_written_again()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromMinutes(59));

        var response = await client.GetAsync("/api/auth/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(SessionCookieExpiry(response));
    }

    internal static DateTimeOffset? SessionCookieExpiry(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            return null;
        }

        var cookie = cookies.SingleOrDefault(c => c.StartsWith("__Host-popkin=", StringComparison.Ordinal));
        if (cookie is null)
        {
            return null;
        }

        var expires = cookie.Split(';', StringSplitOptions.TrimEntries).Single(a => a.StartsWith("expires=", StringComparison.OrdinalIgnoreCase));
        return DateTimeOffset.Parse(expires[8..], System.Globalization.CultureInfo.InvariantCulture);
    }
}
