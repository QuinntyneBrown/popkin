using System.Net.Http.Json;

namespace Popkin.Api.Tests.Support;

public static class NotificationExtensions
{
    /// <summary>A new person who signed up with an email address, signed in.</summary>
    public static async Task<HttpClient> SignedUpByEmailAsync(this ApiFactory api, string name, string email)
    {
        var client = api.CreateBrowserClient();
        var verificationId = await client.RequestCodeAsync(email, channel: "Email");
        var code = api.Codes.Sent.Last().Code;
        var response = await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code, name });
        response.EnsureSuccessStatusCode();
        return client;
    }
}
