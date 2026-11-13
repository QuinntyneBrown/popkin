using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>How many members gave an experience this many stars.</summary>
public sealed record ExperienceStarCountDto(int Stars, int Count);

/// <summary>
/// The group's score of an experience (L2-038 AC2, AC3): the average to one decimal, null when
/// nobody has rated it (AC5), the number of ratings, and the count for each star value, always
/// five entries, five stars first.
/// </summary>
public sealed record ExperienceScoreDto(double? Average, int RatingCount, IReadOnlyList<ExperienceStarCountDto> Counts)
{
    public static ExperienceScoreDto Of(ExperienceScore score) =>
        new(score.Average, score.Count, [.. new[] { 5, 4, 3, 2, 1 }.Select(stars => new ExperienceStarCountDto(stars, score.CountFor(stars)))]);
}

/// <summary>The reader's own rating of an experience, and their comment when they wrote one.</summary>
public sealed record MyRatingDto(int Stars, string? Comment);

/// <summary>
/// An experience as its page shows it (L2-038): the card's fields with the picture at display
/// size, its place, the group's score, the reader's own rating, what people said, the newest
/// first, and what the reader can do. Nothing can be done once the Popkin has wrapped up (L2-045).
/// </summary>
public sealed record ExperienceDetailDto(
    Guid Id,
    ExperienceKind Kind,
    string Title,
    string? PictureUrl,
    string Emoji,
    PopkinColour Colour,
    ExperienceSharerDto SharedBy,
    string? When,
    string? Place,
    DateTimeOffset SharedAt,
    double? Average,
    int RatingCount,
    int KeenCount,
    ExperienceScoreDto Score,
    MyRatingDto? MyRating,
    IReadOnlyList<ExperienceCommentDto> Comments,
    bool CanRate,
    bool CanEdit,
    bool CanDelete);

/// <summary>One experience of a Popkin, for any of its members (L2-038, L2-051 AC1).</summary>
public sealed record GetExperienceQuery(Guid PopkinId, Guid ExperienceId) : IRequest<ExperienceDetailDto>;

public sealed class GetExperienceQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetExperienceQuery, ExperienceDetailDto>
{
    public async Task<ExperienceDetailDto> Handle(GetExperienceQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var experience = await Experiences.RequireAsync(db.Experiences.AsNoTracking(), popkin.Id, request.ExperienceId, cancellationToken);
        // A member who has left still shared their experience.
        var sharer = await db.Memberships.AsNoTracking().FirstAsync(m => m.Id == experience.SharerMembershipId, cancellationToken);
        var active = popkin.Status == PopkinStatus.Active;
        var score = await ExperienceScores.OfAsync(db, experience, cancellationToken);
        var mine = await db.ExperienceRatings.AsNoTracking()
            .FirstOrDefaultAsync(r => r.ExperienceId == experience.Id && r.MembershipId == membership.Id, cancellationToken);

        return new ExperienceDetailDto(
            experience.Id,
            experience.Kind,
            experience.Title,
            experience.PictureKey is { } key ? store.GetReadUrl(key) : null,
            popkin.Emoji,
            popkin.Colour,
            ExperienceSharerDto.Of(sharer, store),
            experience.When,
            experience.Place,
            experience.SharedAt,
            score.Average,
            score.Count,
            KeenCount: 0,
            ExperienceScoreDto.Of(score),
            mine is null ? null : new MyRatingDto(mine.Stars, Comment: null),
            Comments: [],
            CanRate: active && experience.IsRateable,
            CanEdit: active && experience.CanBeEditedBy(membership),
            CanDelete: active && experience.CanBeDeletedBy(membership));
    }
}

public static class Experiences
{
    /// <summary>The experience of this Popkin; one of another Popkin is the same as none (L2-051 AC3).</summary>
    public static async Task<Experience> RequireAsync(IQueryable<Experience> experiences, Guid popkinId, Guid experienceId, CancellationToken cancellationToken) =>
        await experiences.FirstOrDefaultAsync(e => e.Id == experienceId && e.PopkinId == popkinId, cancellationToken)
        ?? throw new ProblemException(404, "experience_not_found", "This experience isn't here.");
}
