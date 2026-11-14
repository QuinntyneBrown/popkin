using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

/// <summary>Phone sign-in is switched on by its owner (L2-084): GET /api/auth/channels and the refusal of a phone code.</summary>
public sealed class SignInChannelsTests
{
    [Fact]
    public async Task With_phone_sign_in_off_email_alone_is_offered_without_a_session()
    {
        using var api = new ApiFactory();
        api.Settings["Features:PhoneSignIn"] = "false";
        var client = api.CreateBrowserClient();

        var response = await client.GetAsync("/api/auth/channels");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(["Email"], body.GetProperty("channels").EnumerateArray().Select(c => c.GetString()));
    }

    [Fact]
    public async Task With_phone_sign_in_on_phone_and_email_are_offered()
    {
        using var api = new ApiFactory();
        api.Settings["Features:PhoneSignIn"] = "true";
        var client = api.CreateBrowserClient();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/auth/channels");

        Assert.Equal(["Phone", "Email"], body.GetProperty("channels").EnumerateArray().Select(c => c.GetString()));
    }

    [Theory]
    [InlineData("SignUp")]
    [InlineData("SignIn")]
    public async Task With_phone_sign_in_off_a_phone_code_is_refused_and_none_is_sent(string purpose)
    {
        using var api = new ApiFactory();
        api.Settings["Features:PhoneSignIn"] = "false";
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", new { purpose, channel = "Phone", destination = "(415) 555-0148" });

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "channel_not_offered");
        Assert.Equal("channel", body.GetProperty("field").GetString());
        Assert.Empty(api.Codes.Sent);
    }

    [Fact]
    public async Task With_phone_sign_in_off_an_email_code_is_still_sent()
    {
        using var api = new ApiFactory();
        api.Settings["Features:PhoneSignIn"] = "false";
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignIn", channel = "Email", destination = "mara@hey.com" });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal("mara@hey.com", api.Codes.Sent.Single().Destination);
    }
}
