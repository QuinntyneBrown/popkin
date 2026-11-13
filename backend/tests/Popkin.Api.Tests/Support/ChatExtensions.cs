using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Realtime;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class ChatExtensions
{
    /// <summary>The id of the Popkin's Everyone thread, as a member reads it.</summary>
    public static async Task<Guid> EveryoneThreadIdAsync(this HttpClient member, Guid popkinId) =>
        (await member.EveryoneThreadAsync(popkinId)).GetProperty("id").GetGuid();

    public static Task<JsonElement> EveryoneThreadAsync(this HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads/everyone");

    /// <summary>The member's own membership id in the Popkin.</summary>
    public static async Task<Guid> MembershipIdAsync(this HttpClient member, Guid popkinId) =>
        (await member.EveryoneThreadAsync(popkinId)).GetProperty("viewer").GetProperty("membershipId").GetGuid();

    /// <summary>Opens the direct message with another member, named by their membership id.</summary>
    public static Task<HttpResponseMessage> OpenDirectAsync(this HttpClient member, Guid popkinId, Guid memberId) =>
        member.PutAsync($"/api/popkins/{popkinId}/threads/direct/{memberId}", null);

    /// <summary>Opens a direct message that must be answered, and returns the thread.</summary>
    public static async Task<JsonElement> DirectThreadAsync(this HttpClient member, Guid popkinId, Guid memberId)
    {
        var response = await member.OpenDirectAsync(popkinId, memberId);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>The id of the direct message with another member, opened if it was not yet.</summary>
    public static async Task<Guid> DirectThreadIdAsync(this HttpClient member, Guid popkinId, Guid memberId) =>
        (await member.DirectThreadAsync(popkinId, memberId)).GetProperty("id").GetGuid();

    /// <summary>Posts a message under a new client message id, or the one given.</summary>
    public static Task<HttpResponseMessage> SendMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, string? text, Guid? clientMessageId = null) =>
        member.PostAsJsonAsync($"/api/popkins/{popkinId}/threads/{threadId}/messages", new { clientMessageId = clientMessageId ?? Guid.NewGuid(), text });

    /// <summary>Posts a message that must be stored, and returns it.</summary>
    public static async Task<JsonElement> SentMessageAsync(this HttpClient member, Guid popkinId, Guid threadId, string text, Guid? clientMessageId = null)
    {
        var response = await member.SendMessageAsync(popkinId, threadId, text, clientMessageId);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>A page of the thread's messages; `query` is the query string without its question mark.</summary>
    public static Task<JsonElement> MessagesAsync(this HttpClient member, Guid popkinId, Guid threadId, string query = "") =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/threads/{threadId}/messages?{query}");

    public static List<string> Texts(this JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(m => m.GetProperty("text").GetString()!).ToList();

    public static List<Guid> Ids(this JsonElement page) =>
        page.GetProperty("items").EnumerateArray().Select(m => m.GetProperty("id").GetGuid()).ToList();

    /// <summary>
    /// Adds messages by the Host straight to the store, numbered from 1 and `apart` after one
    /// another, for a thread longer than a member may write in a minute (L2-053 AC2). Returns
    /// their ids in the order written.
    /// </summary>
    public static async Task<List<Guid>> AddMessagesAsync(this ApiFactory api, Guid popkinId, int count, TimeSpan apart)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var thread = db.ChatThreads.Single(t => t.PopkinId == popkinId && t.Kind == ChatThreadKind.Everyone);
        var host = db.Memberships.Single(m => m.PopkinId == popkinId && m.Role == MembershipRole.Host);
        var messages = new List<Message>();
        for (var number = 1; number <= count; number++)
        {
            api.Clock.Advance(apart);
            messages.Add(Message.Send(thread.Id, host.Id, $"Message {number}", Guid.NewGuid(), api.Clock.GetUtcNow()));
        }

        db.Messages.AddRange(messages);
        await db.SaveChangesAsync();
        return messages.Select(m => m.Id).ToList();
    }

    /// <summary>
    /// Puts every member of the Popkin "here now", as if each had Popkin open, for a cast larger
    /// than one address may sign up (L2-053 AC1).
    /// </summary>
    public static void ConnectEveryMember(this ApiFactory api, Guid popkinId)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var presence = scope.ServiceProvider.GetRequiredService<PresenceTracker>();
        foreach (var personId in db.Memberships.Where(m => m.PopkinId == popkinId && m.LeftAt == null).Select(m => m.PersonId).ToList())
        {
            presence.Connect($"test-{personId:N}", personId, [popkinId]);
        }
    }

    public static int MessageCount(this ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Messages.Count();
    }
}
