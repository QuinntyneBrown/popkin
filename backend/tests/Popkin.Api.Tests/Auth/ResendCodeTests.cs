using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

/// <summary>POST /api/auth/codes/{id}/resend (L2-005 AC1, AC2, AC4).</summary>
public sealed class ResendCodeTests
{
    [Fact]
    public async Task A_new_code_within_thirty_seconds_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromSeconds(29));

        var response = await client.PostAsync($"/api/auth/codes/{id}/resend", null);

        var body = await response.AssertProblem(HttpStatusCode.TooManyRequests, "code_resend_too_soon");
        Assert.Equal(1, body.GetProperty("retryAfterSeconds").GetInt32());
    }

    [Fact]
    public async Task After_thirty_seconds_a_new_code_is_sent_and_the_earlier_one_stops_working()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var first = await client.RequestCodeAsync("(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromSeconds(30));
        api.CodeGenerator.Next("135790");

        var response = await client.PostAsync($"/api/auth/codes/{first}/resend", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var second = body.GetProperty("verificationId").GetGuid();
        Assert.NotEqual(first, second);
        Assert.Equal("135790", api.Codes.Sent.Last().Code);
        var old = await client.PostAsJsonAsync($"/api/auth/codes/{first}/confirm", new { code = "482913", name = "Mara" });
        await old.AssertProblem(HttpStatusCode.BadRequest, "code_used");
        var fresh = await client.PostAsJsonAsync($"/api/auth/codes/{second}/confirm", new { code = "135790", name = "Mara" });
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);
    }

    [Fact]
    public async Task An_expired_code_can_be_replaced()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromMinutes(11));

        var response = await client.PostAsync($"/api/auth/codes/{id}/resend", null);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task Resending_counts_toward_the_hourly_limit()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        for (var i = 0; i < 4; i++)
        {
            api.Clock.Advance(TimeSpan.FromSeconds(30));
            var sent = await (await client.PostAsync($"/api/auth/codes/{id}/resend", null)).Content.ReadFromJsonAsync<JsonElement>();
            id = sent.GetProperty("verificationId").GetGuid();
        }

        api.Clock.Advance(TimeSpan.FromSeconds(30));
        var response = await client.PostAsync($"/api/auth/codes/{id}/resend", null);

        await response.AssertProblem(HttpStatusCode.TooManyRequests, "code_limit_reached");
    }

    [Fact]
    public async Task An_unknown_verification_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await client.PostAsync($"/api/auth/codes/{Guid.NewGuid()}/resend", null);

        await response.AssertProblem(HttpStatusCode.BadRequest, "verification_unknown");
    }
}
