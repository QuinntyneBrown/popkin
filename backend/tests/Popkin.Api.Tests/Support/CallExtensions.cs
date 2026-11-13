using System.Net.Http.Json;
using System.Text.Json;

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

    public static Task<HttpResponseMessage> CurrentCallAsync(this HttpClient member, Guid popkinId) =>
        member.GetAsync($"/api/popkins/{popkinId}/calls/current");

    public static Guid CallId(this JsonElement joined) => joined.GetProperty("call").GetProperty("id").GetGuid();

    public static Guid ViewerMembershipId(this JsonElement joined) => joined.GetProperty("viewerMembershipId").GetGuid();

    public static List<string?> ParticipantNames(this JsonElement joined) =>
        joined.GetProperty("participants").EnumerateArray().Select(p => p.GetProperty("name").GetString()).ToList();
}
