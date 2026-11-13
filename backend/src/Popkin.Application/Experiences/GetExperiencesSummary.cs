using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>An experience as the Popkin home shows it: its name, its photo if it has one, its average rating and how many rated it.</summary>
public sealed record TopExperienceDto(Guid Id, string Name, string? PhotoUrl, double Average, int RatingCount);

/// <summary>The Experiences section of the Popkin home: how many experiences there are and the highest rated (L2-019 AC5).</summary>
public sealed record ExperiencesSummaryDto(int Count, IReadOnlyList<TopExperienceDto> Top);

/// <summary>The experiences of a Popkin in brief, for any of its members (L2-019 AC5, L2-051 AC1).</summary>
public sealed record GetExperiencesSummaryQuery(Guid PopkinId) : IRequest<ExperiencesSummaryDto>;

public sealed class GetExperiencesSummaryQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetExperiencesSummaryQuery, ExperiencesSummaryDto>
{
    /// <summary>The home names at most three experiences.</summary>
    public const int MaxTop = 3;

    public async Task<ExperiencesSummaryDto> Handle(GetExperiencesSummaryQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);

        var experiences = await db.Experiences.AsNoTracking().Where(e => e.PopkinId == popkin.Id).ToListAsync(cancellationToken);
        var scoreOf = await ExperienceScores.OfAsync(db, experiences, cancellationToken);

        // The highest average first; of two with one average, the one more members rated, then
        // the newer. An experience nobody has rated has no average and is not named.
        var top = experiences
            .Select(e => (Experience: e, Score: scoreOf(e)))
            .Where(rated => rated.Score.Average is not null)
            .OrderByDescending(rated => rated.Score.Average)
            .ThenByDescending(rated => rated.Score.Count)
            .ThenByDescending(rated => rated.Experience.SharedAt)
            .ThenByDescending(rated => rated.Experience.Id)
            .Take(MaxTop)
            .Select(rated => new TopExperienceDto(
                rated.Experience.Id,
                rated.Experience.Title,
                rated.Experience.PictureThumbnailKey is { } key ? store.GetReadUrl(key) : null,
                rated.Score.Average!.Value,
                rated.Score.Count))
            .ToList();

        return new ExperiencesSummaryDto(experiences.Count, top);
    }
}
