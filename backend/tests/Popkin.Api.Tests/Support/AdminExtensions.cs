using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class AdminExtensions
{
    /// <summary>The first Owner that `ApiFactory` names in `Admin:FirstOwner`.</summary>
    public const string FirstOwner = "owner@popkin.app";

    /// <summary>Asks for an admin sign-in code and returns the verification id.</summary>
    public static async Task<Guid> RequestAdminCodeAsync(this HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/admin/auth/codes", new { email });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("verificationId").GetGuid();
    }

    /// <summary>Signs `client` in to the console as the admin with `email`.</summary>
    public static async Task SignInAsAdminAsync(this HttpClient client, ApiFactory api, string email = FirstOwner)
    {
        var verificationId = await client.RequestAdminCodeAsync(email);
        var response = await client.PostAsJsonAsync(
            $"/api/admin/auth/codes/{verificationId}/confirm",
            new { code = api.Codes.LastCodeFor(email.ToLowerInvariant()) });
        response.EnsureSuccessStatusCode();
    }

    /// <summary>A new browser signed in to the console as the first Owner.</summary>
    public static async Task<HttpClient> SignedInOwnerAsync(this ApiFactory api)
    {
        var client = api.CreateBrowserClient();
        await client.SignInAsAdminAsync(api);
        return client;
    }
}
