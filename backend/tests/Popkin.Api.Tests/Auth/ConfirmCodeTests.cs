using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Auth;

/// <summary>POST /api/auth/codes/{id}/confirm (L2-004, L2-005 AC3, AC5, L2-006 AC2, L2-007).</summary>
public sealed class ConfirmCodeTests
{
    private static Task<HttpResponseMessage> Confirm(HttpClient client, Guid id, string code, string? name = "Mara") =>
        client.PostAsJsonAsync($"/api/auth/codes/{id}/confirm", new { code, name });

    [Fact]
    public async Task The_right_code_and_a_name_make_an_account_and_sign_the_person_in()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");

        var response = await Confirm(client, id, "482913");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SignedIn", body.GetProperty("outcome").GetString());
        Assert.True(body.GetProperty("isNewPerson").GetBoolean());
        Assert.Equal("Mara", body.GetProperty("session").GetProperty("name").GetString());
        var session = await client.GetFromJsonAsync<JsonElement>("/api/auth/session");
        Assert.Equal("Mara", session.GetProperty("name").GetString());
    }

    [Fact]
    public async Task The_session_cookie_cannot_be_read_by_scripts_goes_only_over_https_and_not_with_other_sites()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");

        var response = await Confirm(client, id, "482913");

        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("__Host-popkin=", StringComparison.Ordinal));
        var attributes = cookie.Split(';', StringSplitOptions.TrimEntries).Skip(1).ToList();
        Assert.Contains("httponly", attributes, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("secure", attributes, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", attributes, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("path=/", attributes, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain(attributes, a => a.StartsWith("domain", StringComparison.OrdinalIgnoreCase));
        var expires = DateTimeOffset.Parse(attributes.Single(a => a.StartsWith("expires=", StringComparison.OrdinalIgnoreCase))[8..]);
        Assert.Equal(api.Clock.GetUtcNow().AddDays(30), expires);
    }

    [Fact]
    public async Task A_wrong_code_is_refused_and_counts_an_attempt()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");

        var response = await Confirm(client, id, "111111");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "code_mismatch");
        Assert.Equal(4, body.GetProperty("attemptsLeft").GetInt32());
        Assert.Equal(1, api.StoredCodes().Single().Attempts);
    }

    [Fact]
    public async Task After_five_wrong_codes_even_the_right_one_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        for (var i = 0; i < 5; i++)
        {
            await Confirm(client, id, "111111");
        }

        var response = await Confirm(client, id, "482913");

        await response.AssertProblem(HttpStatusCode.BadRequest, "code_attempts_exhausted");
    }

    [Fact]
    public async Task A_code_sent_more_than_ten_minutes_ago_has_expired()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        api.Clock.Advance(TimeSpan.FromMinutes(10));

        var response = await Confirm(client, id, "482913");

        await response.AssertProblem(HttpStatusCode.BadRequest, "code_expired");
    }

    [Fact]
    public async Task An_unknown_verification_reads_as_expired()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();

        var response = await Confirm(client, Guid.NewGuid(), "482913");

        await response.AssertProblem(HttpStatusCode.BadRequest, "code_expired");
    }

    [Fact]
    public async Task A_code_works_once()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");
        await Confirm(client, id, "482913");

        var response = await Confirm(api.CreateBrowserClient(), id, "482913");

        await response.AssertProblem(HttpStatusCode.BadRequest, "code_used");
    }

    [Fact]
    public async Task Without_an_account_or_a_name_a_name_is_asked_for_and_the_code_still_works()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148", purpose: "SignIn");

        var asked = await Confirm(client, id, "482913", name: null);
        var named = await Confirm(client, id, "482913", name: "Mara");

        var body = await asked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("NameRequired", body.GetProperty("outcome").GetString());
        Assert.Equal(HttpStatusCode.OK, named.StatusCode);
    }

    [Theory]
    [InlineData("   ")]
    [InlineData("This name is far too long to fit in forty characters")]
    public async Task A_name_that_breaks_its_rule_is_refused(string name)
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148");

        var response = await Confirm(client, id, "482913", name);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "name_invalid");
        Assert.Equal("name", body.GetProperty("field").GetString());
    }

    [Fact]
    public async Task Signing_up_with_a_known_number_signs_into_that_account_and_keeps_its_name()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        var other = api.CreateBrowserClient();
        var id = await other.RequestCodeAsync("(415) 555-0148");

        var response = await Confirm(other, id, "482913", name: "Someone else");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("isNewPerson").GetBoolean());
        Assert.Equal("Mara", body.GetProperty("session").GetProperty("name").GetString());
    }
    [Fact]
    public async Task The_answer_is_the_same_whether_or_not_an_account_exists()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");

        var known = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignIn", channel = "Phone", destination = "(415) 555-0148" });
        var unknown = await client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignIn", channel = "Phone", destination = "(415) 555-0199" });

        Assert.Equal(known.StatusCode, unknown.StatusCode);
        var a = await known.Content.ReadFromJsonAsync<JsonElement>();
        var b = await unknown.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(
            a.EnumerateObject().Select(p => p.Name),
            b.EnumerateObject().Select(p => p.Name));
    }

}
