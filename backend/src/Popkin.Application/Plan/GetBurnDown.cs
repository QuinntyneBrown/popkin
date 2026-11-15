using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>The points left at the end of one day of the sprint (L2-071 AC4).</summary>
public sealed record BurnDayDto(DateOnly Day, int PointsLeft);

/// <summary>When the plan finishes (L2-071 AC3): `Days` late or early, 0 on the last day.</summary>
public sealed record ForecastDto(ForecastKind Kind, DateOnly? Date, int Days);

/// <summary>
/// The burn-down (L2-071): the sprint (null before the first story), the start points, the points
/// left and how far behind the ideal line (positive behind, negative ahead), the forecast, the
/// points left at the end of each day so far, and the three biggest stories still open.
/// </summary>
public sealed record BurnDownDto(
    SprintDto? Sprint,
    int StartPoints,
    int PointsLeft,
    int Behind,
    ForecastDto? Forecast,
    IReadOnlyList<BurnDayDto> Days,
    IReadOnlyList<StoryDto> Biggest);

/// <summary>The burn-down of a Popkin's sprint, for any of its members (L2-071, L2-051).</summary>
public sealed record GetBurnDownQuery(Guid PopkinId) : IRequest<BurnDownDto>;

public sealed class GetBurnDownQueryHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<GetBurnDownQuery, BurnDownDto>
{
    public async Task<BurnDownDto> Handle(GetBurnDownQuery request, CancellationToken cancellationToken)
    {
        // Before membership, so nothing of the feature answers while it is off (L2-077 AC3).
        features.Require(Feature.Plan, request.PopkinId);
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var sprint = await db.Sprints.SingleOrDefaultAsync(s => s.PopkinId == popkin.Id, cancellationToken);
        if (sprint is null)
        {
            return new BurnDownDto(null, 0, 0, 0, null, [], []);
        }

        var today = PlanDays.Today(clock);
        var history = await PlanStories.HistoryAsync(db, sprint, cancellationToken);
        var stories = await PlanStories.ReadAsync(db, photos, popkin.Id, membership, cancellationToken);
        var forecast = history.Forecast(today);

        return new BurnDownDto(
            SprintDto.Of(sprint, today),
            history.StartPoints,
            history.PointsLeftAtEndOf(today),
            history.Behind(today),
            new ForecastDto(forecast.Kind, forecast.Date, forecast.Days),
            history.Days(today).Select(d => new BurnDayDto(d.Day, d.PointsLeft)).ToList(),
            PlanStories.Biggest(stories));
    }
}
