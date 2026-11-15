using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

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

    /// <summary>The first Owner adds `email` with `role`; returns the new admin's id.</summary>
    public static async Task<Guid> AddAdminAsync(this HttpClient owner, string email, string role)
    {
        var response = await owner.PostAsJsonAsync("/api/admin/admins", new { email, role });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    /// <summary>A new browser signed in as an admin of `role`, added by `owner`.</summary>
    public static async Task<(HttpClient Client, Guid Id)> SignedInAdminAsync(this ApiFactory api, HttpClient owner, string email, string role)
    {
        var id = await owner.AddAdminAsync(email, role);
        var client = api.CreateBrowserClient();
        await client.SignInAsAdminAsync(api, email);
        return (client, id);
    }

    /// <summary>
    /// Sets a feature's switch straight in the store, as an Owner would set it, and has the API
    /// read it at its next request: the arrangement of a test about a feature, not about the switch.
    /// </summary>
    public static async Task SwitchFeatureAsync(this ApiFactory api, Feature feature, FeatureMode mode)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var setting = db.FeatureSettings.SingleOrDefault(s => s.Feature == feature);
        if (setting is null)
        {
            db.FeatureSettings.Add(FeatureSetting.Start(feature, mode, null, "Popkin", api.Clock.GetUtcNow()));
        }
        else
        {
            setting.ChangeMode(mode, null, "Popkin", api.Clock.GetUtcNow());
        }

        await db.SaveChangesAsync();
        scope.ServiceProvider.GetRequiredService<IPlatformSnapshot>().Invalidate();
    }
}
