using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Schedules;

/// <summary>A week of the group's time off (L2-072).</summary>
public sealed record TimeOffWeekDto(DateOnly Week);

/// <summary>Time off of one week, Monday to Sunday, for any member (L2-072, L2-077 AC3).</summary>
public sealed record GetTimeOffWeekQuery(Guid PopkinId, DateOnly? Week) : IRequest<TimeOffWeekDto>;

public sealed class GetTimeOffWeekQueryHandler(IFeatureSwitches features, IMembershipGuard guard)
    : IRequestHandler<GetTimeOffWeekQuery, TimeOffWeekDto>
{
    public async Task<TimeOffWeekDto> Handle(GetTimeOffWeekQuery request, CancellationToken cancellationToken)
    {
        // The switch comes first: while it is off, nothing of the feature answers (L2-077 AC3).
        features.Require(Feature.Schedules);
        await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        return new TimeOffWeekDto(request.Week ?? default);
    }
}
