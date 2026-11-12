using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

/// <summary>POST /api/auth/codes: issuing a six-digit code (L2-003, L2-005 AC4, L2-053 AC1, L2-054 AC4).</summary>
public sealed class RequestCodeTests
{
    private static object SignUp(string destination, string channel = "Phone") =>
        new { purpose = "SignUp", channel, destination };

    [Fact]
    public async Task A_valid_phone_number_gets_a_code_sent_to_it()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(Guid.TryParse(body.GetProperty("verificationId").GetString(), out _));
        Assert.Equal("Phone", body.GetProperty("channel").GetString());
        Assert.Equal("(•••) •••-••48", body.GetProperty("displayDestination").GetString());
        Assert.Equal(api.Clock.GetUtcNow().AddSeconds(30), body.GetProperty("resendAvailableAt").GetDateTimeOffset());
        Assert.Equal(("+14155550148", "482913"), api.Codes.Sent.Single());
    }

    [Fact]
    public async Task A_valid_email_gets_a_code_and_is_shown_in_full()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp(" Mara@Hey.com ", "Email"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("mara@hey.com", body.GetProperty("displayDestination").GetString());
        Assert.Equal("mara@hey.com", api.Codes.Sent.Single().Destination);
    }

    [Theory]
    [InlineData("Phone", "(415) 555-014", "phone_invalid")]
    [InlineData("Phone", "", "phone_invalid")]
    [InlineData("Email", "mara@hey", "email_invalid")]
    [InlineData("Email", "", "email_invalid")]
    public async Task A_destination_that_breaks_its_rule_is_refused_and_no_code_is_sent(string channel, string destination, string code)
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp(destination, channel));

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal("destination", body.GetProperty("field").GetString());
        Assert.Empty(api.Codes.Sent);
    }

    [Fact]
    public async Task An_unknown_channel_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148", "Pigeon"));

        await response.AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
    }

    [Fact]
    public async Task Only_a_hash_of_the_code_is_stored()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        var stored = api.StoredCodes().Single();
        Assert.NotEqual("482913", stored.CodeHash);
        Assert.DoesNotContain("482913", stored.CodeHash);
        Assert.Equal(api.Clock.GetUtcNow().AddMinutes(10), stored.ExpiresAt);
    }

    [Fact]
    public async Task A_sixth_code_for_one_destination_within_an_hour_is_refused_with_when_to_try_again()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"))).StatusCode);
            api.Clock.Advance(TimeSpan.FromMinutes(5));
        }

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        var body = await response.AssertProblem(HttpStatusCode.TooManyRequests, "code_limit_reached");
        // The first code was sent 25 minutes ago; it stops counting 35 minutes from now.
        Assert.Equal(35 * 60, body.GetProperty("retryAfterSeconds").GetInt32());
        Assert.Equal("2100", response.Headers.RetryAfter?.Delta?.TotalSeconds.ToString());
        Assert.Equal(5, api.Codes.Sent.Count);
    }

    [Fact]
    public async Task Codes_for_a_destination_count_again_once_the_hour_has_passed()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));
        }

        api.Clock.Advance(TimeSpan.FromMinutes(61));
        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task More_than_ten_code_requests_from_one_address_in_ten_minutes_are_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 10; i++)
        {
            var ok = await client.PostAsJsonAsync("/api/auth/codes", SignUp($"(415) 555-01{i:00}"));
            Assert.Equal(HttpStatusCode.Accepted, ok.StatusCode);
        }

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0199"));

        var body = await response.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.True(body.GetProperty("retryAfterSeconds").GetInt32() > 0);
    }

    [Fact]
    public async Task A_code_the_provider_cannot_send_is_reported_and_stops_working()
    {
        using var api = new ApiFactory();
        api.Codes.Fail = true;
        var client = api.CreateBrowserClient();

        var response = await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        await response.AssertProblem(HttpStatusCode.ServiceUnavailable, "code_not_sent");
        Assert.NotNull(api.StoredCodes().Single().ConsumedAt);
    }

    [Fact]
    public async Task A_new_code_stops_the_earlier_one_working()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));
        await client.PostAsJsonAsync("/api/auth/codes", SignUp("(415) 555-0148"));

        var codes = api.StoredCodes().OrderBy(c => c.SentAt).ToList();
        Assert.NotNull(codes[0].ConsumedAt);
        Assert.Null(codes[1].ConsumedAt);
    }
}
