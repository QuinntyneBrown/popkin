using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

/// <summary>A Popkin the caller started: its id and its invite code.</summary>
public sealed record StartedSpace(Guid Id, string Code);

public static class AccountExtensions
{
    /// <summary>Starts a Popkin that keeps going, Coral, with one of the twelve emoji.</summary>
    public static async Task<StartedSpace> StartedAsync(this HttpClient host, string name, string emoji)
    {
        var response = await host.PostAsJsonAsync("/api/popkins", new { name, emoji, colour = "Coral", length = "KeepItGoing" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new StartedSpace(body.GetProperty("id").GetGuid(), body.GetProperty("inviteCode").GetString()!);
    }
}
