using System.Net.Http.Json;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class WrapUpExtensions
{
    /// <summary>Asks to wrap the Popkin up; `body` is `{ keepPhotos }` unless a test sends something else.</summary>
    public static Task<HttpResponseMessage> WrapUpAsync(this HttpClient member, Guid popkinId, object? body = null) =>
        member.PostAsJsonAsync($"/api/popkins/{popkinId}/wrap-up", body ?? new { keepPhotos = true });

    /// <summary>Wraps the Popkin up, which must succeed, and returns the answer.</summary>
    public static async Task<JsonElement> WrappedUpAsync(this HttpClient host, Guid popkinId, bool keepPhotos = true)
    {
        var response = await host.WrapUpAsync(popkinId, new { keepPhotos });
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Task<JsonElement> HomeAsync(this HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}");

    public static Task<HttpResponseMessage> RecapAsync(this HttpClient member, Guid popkinId) =>
        member.GetAsync($"/api/popkins/{popkinId}/recap");

    /// <summary>The recap, which must be answered.</summary>
    public static Task<JsonElement> ReadRecapAsync(this HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/recap");

    /// <summary>
    /// Signs the person in again with a code, as they must after 30 days: a test of what happens
    /// 30 days after a wrap-up outlives the session it began with.
    /// </summary>
    public static async Task SignInAgainAsync(this HttpClient client, ApiFactory api, string phone)
    {
        var verificationId = await client.RequestCodeAsync(phone, purpose: "SignIn");
        var response = await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code = api.Codes.Sent.Last().Code });
        response.EnsureSuccessStatusCode();
    }

    /// <summary>The Popkin as the store holds it, read through a fresh context.</summary>
    public static PopkinSpace StoredPopkin(this ApiFactory api, Guid popkinId)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Popkins.Single(p => p.Id == popkinId);
    }

    /// <summary>Sends a request through MediatR in a scope of its own, as a Worker job does on a tick.</summary>
    public static async Task<TResponse> SendAsync<TResponse>(this ApiFactory api, IRequest<TResponse> request)
    {
        using var scope = api.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(request);
    }
}
