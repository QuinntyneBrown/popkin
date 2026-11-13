using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace Popkin.Api.Tests.Support;

public static class CallExtensions
{
    /// <summary>Starts the Popkin's group call, or joins the one under way; `body` is `{ micOn?, cameraOn? }` when given.</summary>
    public static Task<HttpResponseMessage> StartOrJoinCallAsync(this HttpClient member, Guid popkinId, object? body = null) =>
        body is null
            ? member.PostAsync($"/api/popkins/{popkinId}/calls", null)
            : member.PostAsJsonAsync($"/api/popkins/{popkinId}/calls", body);

    /// <summary>Starts or joins a call that must be answered, and returns the `JoinedCallDto`.</summary>
    public static async Task<JsonElement> OnCallAsync(this HttpClient member, Guid popkinId, object? body = null)
    {
        var response = await member.StartOrJoinCallAsync(popkinId, body);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static Task<HttpResponseMessage> LeaveCallAsync(this HttpClient member, Guid popkinId, Guid callId) =>
        member.PostAsync($"/api/popkins/{popkinId}/calls/{callId}/leave", null);

    /// <summary>Records the member's microphone and camera on the call; `body` is `{ micOn?, cameraOn? }`.</summary>
    public static Task<HttpResponseMessage> SetCallMediaAsync(this HttpClient member, Guid popkinId, Guid callId, object body) =>
        member.PatchAsJsonAsync($"/api/popkins/{popkinId}/calls/{callId}/participants/me", body);

    public static Task<HttpResponseMessage> CurrentCallAsync(this HttpClient member, Guid popkinId) =>
        member.GetAsync($"/api/popkins/{popkinId}/calls/current");

    /// <summary>Invokes the hub's `JoinCall`, so the connection is sent the call's events and its participant's signals.</summary>
    public static Task JoinCallAsync(this HubEvents hub, Guid callId) => hub.Connection.InvokeAsync("JoinCall", callId);

    /// <summary>Asserts that a hub call was refused with that `code`, as the client reads it.</summary>
    public static async Task AssertRefusedAsync(Func<Task> invoke, string code)
    {
        var refused = await Assert.ThrowsAsync<HubException>(invoke);
        Assert.EndsWith($"HubException: {code}", refused.Message);
    }

    public static Guid CallId(this JsonElement joined) => joined.GetProperty("call").GetProperty("id").GetGuid();

    public static Guid ViewerMembershipId(this JsonElement joined) => joined.GetProperty("viewerMembershipId").GetGuid();

    /// <summary>The participant the member who joined is.</summary>
    public static JsonElement Viewer(this JsonElement joined) =>
        joined.GetProperty("participants").EnumerateArray().Single(p => p.GetProperty("membershipId").GetGuid() == joined.ViewerMembershipId());

    public static List<string?> ParticipantNames(this JsonElement joined) =>
        joined.GetProperty("participants").EnumerateArray().Select(p => p.GetProperty("name").GetString()).ToList();
}
