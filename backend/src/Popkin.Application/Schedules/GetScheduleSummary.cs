using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>
/// The home's Schedule section (L2-075 AC2, AC3): whether anyone has hours in the seven days,
/// and the first day everyone is free in the evening, with the time they are free from.
/// </summary>
public sealed record ScheduleSummaryDto(bool HasHours, DateOnly? Day, string? EveryoneFreeFrom);

/// <summary>The summary of this week: seven days from `From`, or from the server's date without one.</summary>
public sealed record GetScheduleSummaryQuery(Guid PopkinId, DateOnly? From) : IRequest<ScheduleSummaryDto>;

public sealed class GetScheduleSummaryQueryHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetScheduleSummaryQuery, ScheduleSummaryDto>
{
    public async Task<ScheduleSummaryDto> Handle(GetScheduleSummaryQuery request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Schedules);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var from = request.From ?? DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        var week = await ThisWeeks.ReadAsync(db, photos, popkin, membership, from, cancellationToken);
        var hasHours = week.Members.Any(member => member.Days.Any(day => day.Count > 0));
        var free = week.Days.FirstOrDefault(day => day.EveryoneFreeFrom is not null);
        return new ScheduleSummaryDto(hasHours, free?.Date, free?.EveryoneFreeFrom);
    }
}
