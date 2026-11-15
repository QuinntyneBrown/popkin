using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>The sprint as the board's header shows it (L2-068 AC2).</summary>
public sealed record SprintDto(string Name, DateOnly FirstDay, DateOnly LastDay, int DaysLeft)
{
    public static SprintDto Of(Sprint sprint, DateOnly today) =>
        new(sprint.Name, sprint.FirstDay, sprint.LastDay, sprint.DaysLeft(today));
}

/// <summary>The member on a story, as its card shows them (L2-068 AC4).</summary>
public sealed record StoryOwnerDto(Guid MembershipId, string FirstName, AvatarDto Avatar);

/// <summary>
/// A story on the board (L2-068 AC4): `CommentCount` is 0 until story comments exist, and
/// `CanDelete` says whether the viewer added it, owns it or is the Host (L2-070 AC4).
/// </summary>
public sealed record StoryDto(
    Guid Id,
    string Title,
    StoryColumn Column,
    int Points,
    StoryTag Tag,
    StoryOwnerDto? Owner,
    DateOnly? DueDate,
    int CommentCount,
    Guid AddedByMembershipId,
    bool CanDelete,
    DateTimeOffset AddedAt);

/// <summary>How the sprint is going (L2-068 AC7): `Behind` is positive behind, negative ahead.</summary>
public sealed record PlanProgressDto(int PointsLeft, int Behind, IReadOnlyList<int> Sparkline);

/// <summary>A calendar day is a day in UTC (L2-068).</summary>
public static class PlanDays
{
    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

    public static DateOnly DayOf(DateTimeOffset at) => DateOnly.FromDateTime(at.UtcDateTime);
}

/// <summary>A Popkin's stories as the board lists them: by column, each in the order it was placed.</summary>
public static class PlanStories
{
    public static async Task<IReadOnlyList<StoryDto>> ReadAsync(
        IAppDbContext db, IPhotoStore photos, Guid popkinId, Membership viewer, CancellationToken cancellationToken)
    {
        var stories = await db.Stories.Where(s => s.PopkinId == popkinId).ToListAsync(cancellationToken);
        var owners = await OwnersAsync(db, stories, cancellationToken);
        return stories
            .OrderBy(s => s.Column)
            .ThenBy(s => s.PlacedAt)
            .ThenBy(s => s.Id)
            .Select(s => Of(s, owners, viewer, photos))
            .ToList();
    }

    public static async Task<IReadOnlyDictionary<Guid, Membership>> OwnersAsync(
        IAppDbContext db, IReadOnlyCollection<Story> stories, CancellationToken cancellationToken)
    {
        var ids = stories.Where(s => s.OwnerMembershipId is not null).Select(s => s.OwnerMembershipId!.Value).Distinct().ToList();
        return ids.Count == 0
            ? new Dictionary<Guid, Membership>()
            : await db.Memberships.Where(m => ids.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
    }

    public static StoryDto Of(Story story, IReadOnlyDictionary<Guid, Membership> owners, Membership viewer, IPhotoStore photos)
    {
        var owner = story.OwnerMembershipId is { } id && owners.TryGetValue(id, out var member)
            ? new StoryOwnerDto(member.Id, PersonName.FirstName(member.DisplayName), AvatarDto.Of(member, photos))
            : null;
        return new StoryDto(
            story.Id,
            story.Title,
            story.Column,
            story.Points,
            story.Tag,
            owner,
            story.DueDate,
            0,
            story.AddedByMembershipId,
            MayDelete(story, viewer),
            story.AddedAt);
    }

    /// <summary>The person who added it, its owner or the Host (L2-070 AC4).</summary>
    public static bool MayDelete(Story story, Membership member) =>
        member.Role == MembershipRole.Host || story.AddedByMembershipId == member.Id || story.OwnerMembershipId == member.Id;
}
