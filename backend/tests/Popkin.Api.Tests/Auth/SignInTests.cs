using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Auth;

/// <summary>Coming back: a code with the purpose SignIn, and what confirming it does (L2-006, L2-007 AC1, L2-053 AC1).</summary>
public sealed class SignInTests
{
    private static Task<HttpResponseMessage> RequestSignIn(HttpClient client, string destination) =>
        client.PostAsJsonAsync("/api/auth/codes", new { purpose = "SignIn", channel = "Phone", destination });

    private static Task<HttpResponseMessage> Confirm(HttpClient client, Guid id, string code, string? name) =>
        client.PostAsJsonAsync($"/api/auth/codes/{id}/confirm", new { code, name });

    private static List<Person> People(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().People.ToList();
    }

    // Given one phone number with an account and one without,
    // when a sign-in code is asked for each,
    // then both are answered alike, apart from the verification id and the digits shown,
    // and both did the same work: a code stored, and sent through the provider (L2-006 AC2).
    [Fact]
    public async Task Asking_for_a_code_answers_and_works_the_same_with_or_without_an_account()
    {
        using var api = new ApiFactory();
        await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var client = api.CreateBrowserClient();
        var sentBefore = api.Codes.Sent.Count;
        var storedBefore = api.StoredCodes().Count;

        var known = await RequestSignIn(client, "(415) 555-0148");
        var unknown = await RequestSignIn(client, "(415) 555-0199");

        Assert.Equal(HttpStatusCode.Accepted, known.StatusCode);
        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(
            known.Headers.Select(h => h.Key).Order(),
            unknown.Headers.Select(h => h.Key).Order());
        var a = await known.Content.ReadFromJsonAsync<JsonElement>();
        var b = await unknown.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(a.EnumerateObject().Select(p => p.Name), b.EnumerateObject().Select(p => p.Name));
        Assert.Equal(a.GetProperty("channel").GetString(), b.GetProperty("channel").GetString());
        Assert.Equal(a.GetProperty("resendAvailableAt").GetString(), b.GetProperty("resendAvailableAt").GetString());
        Assert.Equal("(•••) •••-••48", a.GetProperty("displayDestination").GetString());
        Assert.Equal("(•••) •••-••99", b.GetProperty("displayDestination").GetString());
        Assert.NotEqual(a.GetProperty("verificationId").GetGuid(), b.GetProperty("verificationId").GetGuid());
        Assert.Equal(["+14155550148", "+14155550199"], api.Codes.Sent.Skip(sentBefore).Select(s => s.Destination));
        var stored = api.StoredCodes().Where(c => c.Purpose == CodePurpose.SignIn).OrderBy(c => c.Destination).ToList();
        Assert.Equal(storedBefore + 2, api.StoredCodes().Count);
        Assert.Equal(["+14155550148", "+14155550199"], stored.Select(c => c.Destination));
        Assert.All(stored, c => Assert.Null(c.ConsumedAt));
        Assert.Equal(stored[0].ExpiresAt, stored[1].ExpiresAt);
    }

    // Given a person with an account,
    // when they confirm a sign-in code from another browser, with no name,
    // then they are signed in to that account and no second person is made.
    [Fact]
    public async Task A_person_with_an_account_is_signed_in_by_the_code_alone()
    {
        using var api = new ApiFactory();
        await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148", purpose: "SignIn");

        var response = await Confirm(client, id, "482913", name: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SignedIn", body.GetProperty("outcome").GetString());
        Assert.False(body.GetProperty("isNewPerson").GetBoolean());
        var person = Assert.Single(People(api));
        Assert.Equal(person.Id, body.GetProperty("session").GetProperty("personId").GetGuid());
        var session = await client.GetFromJsonAsync<JsonElement>("/api/auth/session");
        Assert.Equal("Mara Okafor", session.GetProperty("name").GetString());
    }

    // Given a person with an account,
    // when a name is sent with their sign-in code,
    // then the name is ignored: the person keeps the name they have.
    [Fact]
    public async Task A_name_sent_when_signing_in_to_an_account_does_not_rename_the_person()
    {
        using var api = new ApiFactory();
        await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148", purpose: "SignIn");

        var response = await Confirm(client, id, "482913", name: "Someone Else");

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SignedIn", body.GetProperty("outcome").GetString());
        Assert.Equal("Mara Okafor", body.GetProperty("session").GetProperty("name").GetString());
        Assert.Equal("Mara Okafor", Assert.Single(People(api)).Name);
    }

    // Given a phone number without an account,
    // when its sign-in code is confirmed with no name,
    // then a name is asked for, nobody is signed in, and the code is neither used nor charged an attempt;
    // when it is confirmed again with a name,
    // then exactly one person exists and is signed in.
    [Fact]
    public async Task A_person_without_an_account_is_asked_for_a_name_and_then_signed_in_with_the_same_code()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        var id = await client.RequestCodeAsync("(415) 555-0148", purpose: "SignIn");

        var asked = await Confirm(client, id, "482913", name: null);

        Assert.Equal(HttpStatusCode.OK, asked.StatusCode);
        var askedBody = await asked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("NameRequired", askedBody.GetProperty("outcome").GetString());
        Assert.Equal(JsonValueKind.Null, askedBody.GetProperty("session").ValueKind);
        Assert.False(asked.Headers.Contains("Set-Cookie"));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/session")).StatusCode);
        var code = Assert.Single(api.StoredCodes());
        Assert.Null(code.ConsumedAt);
        Assert.Equal(0, code.Attempts);
        Assert.Empty(People(api));

        var named = await Confirm(client, id, "482913", name: "Mara Okafor");

        var namedBody = await named.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SignedIn", namedBody.GetProperty("outcome").GetString());
        Assert.True(namedBody.GetProperty("isNewPerson").GetBoolean());
        Assert.Equal("Mara Okafor", Assert.Single(People(api)).Name);
        Assert.NotNull(Assert.Single(api.StoredCodes()).ConsumedAt);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/session")).StatusCode);
    }

    // Given ten sign-in codes asked for from one address within ten minutes,
    // when an eleventh is asked for,
    // then it is refused with 429 rate_limited and no code is sent, as for signing up (L2-053 AC1).
    [Fact]
    public async Task Sign_in_codes_are_limited_per_address_as_sign_up_codes_are()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 10; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await RequestSignIn(client, $"(415) 555-01{i:00}")).StatusCode);
        }

        var response = await RequestSignIn(client, "(415) 555-0199");

        await response.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.Equal(10, api.Codes.Sent.Count);
    }

    // Given five codes sent to one destination within an hour, for signing up or signing in,
    // when a sign-in code is asked for,
    // then it is refused with 429 code_limit_reached: the limit is the destination's, whatever the purpose (L2-005 AC4).
    [Fact]
    public async Task The_five_codes_an_hour_of_a_destination_count_sign_in_and_sign_up_together()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 5; i++)
        {
            await client.RequestCodeAsync("(415) 555-0148", purpose: i % 2 == 0 ? "SignUp" : "SignIn");
        }

        var response = await RequestSignIn(client, "(415) 555-0148");

        await response.AssertProblem(HttpStatusCode.TooManyRequests, "code_limit_reached");
        Assert.Equal(5, api.Codes.Sent.Count);
    }
}
