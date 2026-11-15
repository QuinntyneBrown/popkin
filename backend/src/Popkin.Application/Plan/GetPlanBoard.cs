using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>The plan board (L2-068): the sprint, every story, and how the sprint is going.</summary>
public sealed record PlanBoardDto(SprintDto? Sprint, IReadOnlyList<StoryDto> Stories, PlanProgressDto? Progress, long Version);

/// <summary>The plan board of a Popkin, for any of its members (L2-068, L2-051).</summary>
public sealed record GetPlanBoardQuery(Guid PopkinId) : IRequest<PlanBoardDto>;

public sealed class GetPlanBoardQueryHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetPlanBoardQuery, PlanBoardDto>
{
    public async Task<PlanBoardDto> Handle(GetPlanBoardQuery request, CancellationToken cancellationToken)
    {
        // Before membership, so nothing of the feature answers while it is off (L2-077 AC3).
        features.Require(Feature.Plan);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var sprint = await db.Sprints.SingleOrDefaultAsync(s => s.PopkinId == popkin.Id, cancellationToken);
        var stories = await PlanStories.ReadAsync(db, photos, popkin.Id, membership, cancellationToken);
        var today = PlanDays.Today(clock);
        return new PlanBoardDto(
            sprint is null ? null : SprintDto.Of(sprint, today),
            stories,
            sprint is null || stories.Count == 0 ? null : PlanProgressDto.Of(await PlanStories.HistoryAsync(db, sprint, cancellationToken), today),
            sprint?.Version ?? 0);
    }
}
