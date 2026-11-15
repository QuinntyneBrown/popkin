using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Plan;

/// <summary>The plan board (L2-068): the sprint, every story, and how the sprint is going.</summary>
public sealed record PlanBoardDto(IReadOnlyList<object> Stories, long Version);

/// <summary>The plan board of a Popkin, for any of its members (L2-068, L2-051).</summary>
public sealed record GetPlanBoardQuery(Guid PopkinId) : IRequest<PlanBoardDto>;

public sealed class GetPlanBoardQueryHandler(IFeatureSwitches features, IMembershipGuard guard)
    : IRequestHandler<GetPlanBoardQuery, PlanBoardDto>
{
    public async Task<PlanBoardDto> Handle(GetPlanBoardQuery request, CancellationToken cancellationToken)
    {
        // Before membership, so nothing of the feature answers while it is off (L2-077 AC3).
        features.Require(Feature.Plan);
        await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        return new PlanBoardDto([], 0);
    }
}
