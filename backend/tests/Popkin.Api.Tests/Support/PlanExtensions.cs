using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

public static class PlanExtensions
{
    /// <summary>
    /// Puts a story on a Popkin's board straight in the store, for a test of the board's reads;
    /// the first one starts the sprint today, as adding one does (L2-068).
    /// </summary>
    public static async Task<Guid> SeedStoryAsync(
        this ApiFactory api,
        Guid popkinId,
        string title,
        StoryColumn column,
        int points,
        StoryTag tag = StoryTag.Travel,
        Guid? ownerMembershipId = null,
        Guid? addedByMembershipId = null,
        DateOnly? dueDate = null)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var host = db.Memberships.Single(m => m.PopkinId == popkinId && m.Role == MembershipRole.Host);
        var now = api.Clock.GetUtcNow();
        if (!db.Sprints.Any(s => s.PopkinId == popkinId))
        {
            db.Sprints.Add(Sprint.Start(popkinId, DateOnly.FromDateTime(now.UtcDateTime)));
        }

        // A minute apart, so the order they were placed in is the order they show.
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var story = Story.Add(popkinId, title, column, points, tag, ownerMembershipId, addedByMembershipId ?? host.Id, api.Clock.GetUtcNow());
        if (dueDate is { } due)
        {
            story.Change(title, column, points, tag, ownerMembershipId, due, api.Clock.GetUtcNow());
        }

        db.Stories.Add(story);
        await db.SaveChangesAsync();
        return story.Id;
    }

    /// <summary>`POST …/plan/stories`: a new story, Travel and 2 points in To do unless said otherwise (L2-069).</summary>
    public static Task<HttpResponseMessage> AddStoryAsync(
        this HttpClient member,
        Guid popkinId,
        string? title,
        string column = "ToDo",
        int points = 2,
        string tag = "Travel",
        Guid? ownerMembershipId = null) =>
        member.PostAsJsonAsync(
            $"/api/popkins/{popkinId}/plan/stories",
            new { title, column, points, ownerMembershipId, tag });

    /// <summary>`PUT …/plan/stories/{storyId}/column`: moves a story to a column (L2-070 AC2).</summary>
    public static Task<HttpResponseMessage> MoveStoryAsync(this HttpClient member, Guid popkinId, Guid storyId, string? column) =>
        member.PutAsJsonAsync($"/api/popkins/{popkinId}/plan/stories/{storyId}/column", new { column });

    /// <summary>`PUT …/plan/stories/{storyId}`: saves a change to every field of a story (L2-070 AC3).</summary>
    public static Task<HttpResponseMessage> SaveStoryAsync(
        this HttpClient member,
        Guid popkinId,
        Guid storyId,
        string? title,
        string column = "ToDo",
        int points = 2,
        string tag = "Travel",
        Guid? ownerMembershipId = null,
        string? dueDate = null) =>
        member.PutAsJsonAsync(
            $"/api/popkins/{popkinId}/plan/stories/{storyId}",
            new { title, column, points, ownerMembershipId, tag, dueDate });

    public static Task<JsonElement> PlanBoardAsync(this HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/plan");

    /// <summary>The titles of a column, in the order the board answers them.</summary>
    public static string[] TitlesIn(this JsonElement board, string column) =>
        board.GetProperty("stories").EnumerateArray()
            .Where(s => s.GetProperty("column").GetString() == column)
            .Select(s => s.GetProperty("title").GetString()!)
            .ToArray();

    public static JsonElement StoryTitled(this JsonElement board, string title) =>
        board.GetProperty("stories").EnumerateArray().Single(s => s.GetProperty("title").GetString() == title);
}
