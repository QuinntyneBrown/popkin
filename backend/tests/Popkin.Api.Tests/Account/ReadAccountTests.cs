using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Account;

/// <summary>The account screen reads the caller's own account (L2-048 AC1, L2-054 AC2).</summary>
public sealed class ReadAccountTests
{
    // Given Mara, signed up with (415) 555-0148 and no photo,
    // when she reads her account,
    // then it gives her id, her name, no photo, and the number she signs in with as she typed it.
    [Fact]
    public async Task The_account_shows_the_name_and_the_sign_in_contact()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var session = await mara.GetFromJsonAsync<JsonElement>("/api/auth/session");

        var response = await mara.GetAsync("/api/account");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var account = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(session.GetProperty("personId").GetGuid(), account.GetProperty("personId").GetGuid());
        Assert.Equal("Mara Okafor", account.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, account.GetProperty("photoUrl").ValueKind);
        Assert.Equal("Phone", account.GetProperty("channel").GetString());
        Assert.Equal("(415) 555-0148", account.GetProperty("destination").GetString());
    }

    // Given Walt, signed up with an email, when he reads his account, then it gives his email.
    [Fact]
    public async Task An_email_reads_as_it_is_kept()
    {
        using var api = new ApiFactory();
        var walt = api.CreateBrowserClient();
        var verificationId = await walt.RequestCodeAsync("  Walt@Example.com ", "Email");
        (await walt.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code = api.Codes.Sent.Last().Code, name = "Walt" }))
            .EnsureSuccessStatusCode();

        var account = await walt.GetFromJsonAsync<JsonElement>("/api/account");

        Assert.Equal("Email", account.GetProperty("channel").GetString());
        Assert.Equal("walt@example.com", account.GetProperty("destination").GetString());
    }

    // Given no session, when the account is asked for, then it is refused with 401 (L2-050 AC1).
    [Fact]
    public async Task Without_a_session_the_account_is_refused()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/account");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
