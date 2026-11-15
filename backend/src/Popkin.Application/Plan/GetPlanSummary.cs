using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Plan;

/// <summary>
/// The home's Plan section (L2-075 AC1): the points left, how far behind the ideal line (positive
/// behind, negative ahead) and the three biggest stories still open.
/// </summary>
public sealed record PlanSummaryDto(int PointsLeft, int Behind, IReadOnlyList<StoryDto> Biggest);

/// <summary>
/// The Plan summary of a Popkin, for any of its members; null before the first story, when the
/// home shows no Plan section (L2-075 AC3).
/// </summary>
public sealed record GetPlanSummaryQuery(Guid PopkinId) : IRequest<PlanSummaryDto?>;

public sealed class GetPlanSummaryQueryHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetPlanSummaryQuery, PlanSummaryDto?>
{
    public async Task<PlanSummaryDto?> Handle(GetPlanSummaryQuery request, CancellationToken cancellationToken)
    {
        // Before membership, so nothing of the feature answers while it is off (L2-077 AC3).
        features.Require(Feature.Plan);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var sprint = await db.Sprints.SingleOrDefaultAsync(s => s.PopkinId == popkin.Id, cancellationToken);
        var stories = await PlanStories.ReadAsync(db, photos, popkin.Id, membership, cancellationToken);
        if (sprint is null || stories.Count == 0)
        {
            return null;
        }

        var today = PlanDays.Today(clock);
        var history = await PlanStories.HistoryAsync(db, sprint, cancellationToken);
        return new PlanSummaryDto(history.PointsLeftAtEndOf(today), history.Behind(today), PlanStories.Biggest(stories));
    }
}
