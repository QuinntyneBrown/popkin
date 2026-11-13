using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>
/// The experiences of a Popkin as cards, the newest first, for any of its members (L2-037,
/// L2-051 AC1): all of them, what the group did, restaurants included, or what it wants to do.
/// </summary>
public sealed record GetExperiencesQuery(Guid PopkinId, string? Filter = null) : IRequest<IReadOnlyList<ExperienceCardDto>>;

public sealed class GetExperiencesQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetExperiencesQuery, IReadOnlyList<ExperienceCardDto>>
{
    public async Task<IReadOnlyList<ExperienceCardDto>> Handle(GetExperiencesQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);

        var experiences = db.Experiences.AsNoTracking().Where(e => e.PopkinId == popkin.Id);
        experiences = request.Filter switch
        {
            null or "all" => experiences,
            // "We did" includes restaurants (L2-037 AC4).
            "did" => experiences.Where(e => e.Kind != ExperienceKind.Want),
            "want" => experiences.Where(e => e.Kind == ExperienceKind.Want),
            _ => throw ProblemException.Invalid("invalid_filter", "Choose All, We did or Want to do.", "filter"),
        };

        var listed = await experiences.OrderByDescending(e => e.SharedAt).ThenByDescending(e => e.Id).ToListAsync(cancellationToken);
        return await ExperienceCards.OfAsync(db, store, popkin, listed, cancellationToken);
    }
}
