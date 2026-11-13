using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class ApiExtensions
{
    /// <summary>Every verification code in the store, read through a fresh context.</summary>
    public static List<VerificationCode> StoredCodes(this ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().VerificationCodes.ToList();
    }

    /// <summary>Requests a sign-up code and returns the verification id.</summary>
    public static async Task<Guid> RequestCodeAsync(this HttpClient client, string destination, string channel = "Phone", string purpose = "SignUp")
    {
        var response = await client.PostAsJsonAsync("/api/auth/codes", new { purpose, channel, destination });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("verificationId").GetGuid();
    }

    /// <summary>Signs up end to end: requests a code, then confirms it with a name.</summary>
    public static async Task SignUpAsync(this HttpClient client, ApiFactory api, string name, string phone)
    {
        var verificationId = await client.RequestCodeAsync(phone);
        var code = api.Codes.Sent.Last().Code;
        var response = await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code, name });
        response.EnsureSuccessStatusCode();
    }
}
