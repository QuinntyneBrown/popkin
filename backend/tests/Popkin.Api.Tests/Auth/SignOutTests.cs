using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

/// <summary>POST /api/auth/sign-out ends the session on that device (L2-048 AC5, L2-050 AC3).</summary>
public sealed class SignOutTests
{
    // Given Mara signed in on two devices, when she signs out on one,
    // then it answers 204 and deletes the cookie, a copy of that cookie gets 401 at once,
    // and her other device is still signed in.
    [Fact]
    public async Task Signing_out_ends_the_session_on_that_device_only()
    {
        using var api = new ApiFactory();
        var phone = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var cookie = api.SessionCookieOf(phone);
        var laptop = api.CreateBrowserClient();
        await laptop.SignInAgainAsync(api, "(415) 555-0148");

        var response = await phone.PostAsync("/api/auth/sign-out", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-popkin=;", StringComparison.Ordinal));
        var copy = api.CreateBrowserClient();
        copy.DefaultRequestHeaders.Add("Cookie", cookie);
        Assert.Equal(HttpStatusCode.Unauthorized, (await copy.GetAsync("/api/auth/session")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await phone.GetAsync("/api/auth/session")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await laptop.GetAsync("/api/auth/session")).StatusCode);
    }

    // Given no session, when sign out is asked for, then it is refused with 401.
    [Fact]
    public async Task Without_a_session_sign_out_is_refused()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().PostAsync("/api/auth/sign-out", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
