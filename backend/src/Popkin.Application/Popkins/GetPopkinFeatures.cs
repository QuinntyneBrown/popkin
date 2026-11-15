using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>The Host's choice of one feature the admin app offers the Popkin (L2-153 AC2, AC8).</summary>
public sealed record FeatureChoiceDto(Feature Feature, bool On);

/// <summary>
/// Which switched features this Popkin has, read by its open screens every 60 seconds (L2-076
/// AC10, L2-077 AC4), and the Host's choice of each feature it is offered (L2-153 AC8).
/// </summary>
public sealed record PopkinFeaturesDto(bool Plan, bool Schedules, IReadOnlyList<FeatureChoiceDto> Choices)
{
    private static readonly Feature[] All = [Feature.Plan, Feature.Schedules];

    public static PopkinFeaturesDto Of(IFeatureSwitches features, Guid popkinId) => new(
        features.IsOn(Feature.Plan, popkinId),
        features.IsOn(Feature.Schedules, popkinId),
        All.Where(f => features.IsOffered(f, popkinId))
            .Select(f => new FeatureChoiceDto(f, !features.IsSwitchedOffByHost(f, popkinId)))
            .ToList());
}

public sealed record GetPopkinFeaturesQuery(Guid PopkinId) : IRequest<PopkinFeaturesDto>;

public sealed class GetPopkinFeaturesQueryHandler(IMembershipGuard guard, IFeatureSwitches features)
    : IRequestHandler<GetPopkinFeaturesQuery, PopkinFeaturesDto>
{
    public async Task<PopkinFeaturesDto> Handle(GetPopkinFeaturesQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        return PopkinFeaturesDto.Of(features, popkin.Id);
    }
}

/// <summary>
/// The Host switches the features the admin app offers the Popkin on and off; a feature left out
/// is unchanged (L2-153 AC3, AC7). Data is never deleted (L2-077 AC5).
/// </summary>
public sealed record ChangePopkinFeaturesCommand(Guid PopkinId, bool? Plan, bool? Schedules) : IRequest<PopkinFeaturesDto>;

public sealed class ChangePopkinFeaturesCommandHandler(
    IAppDbContext db,
    IMembershipGuard guard,
    IFeatureSwitches features,
    IPlatformSnapshot snapshot,
    TimeProvider clock) : IRequestHandler<ChangePopkinFeaturesCommand, PopkinFeaturesDto>
{
    public async Task<PopkinFeaturesDto> Handle(ChangePopkinFeaturesCommand request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        var asked = new[] { (Feature.Plan, request.Plan), (Feature.Schedules, request.Schedules) }
            .Where(a => a.Item2 is not null)
            .Select(a => (Feature: a.Item1, On: a.Item2!.Value))
            .ToList();

        // Every feature asked for must be offered, before anything is changed.
        foreach (var (feature, _) in asked)
        {
            if (!features.IsOffered(feature, popkin.Id))
            {
                throw IFeatureSwitches.FeatureOff(feature);
            }
        }

        var off = await db.PopkinFeaturesOff.Where(o => o.PopkinId == popkin.Id).ToListAsync(cancellationToken);
        foreach (var (feature, on) in asked)
        {
            var row = off.FirstOrDefault(o => o.Feature == feature);
            if (on && row is not null)
            {
                db.PopkinFeaturesOff.Remove(row);
            }
            else if (!on && row is null)
            {
                db.PopkinFeaturesOff.Add(PopkinFeatureOff.SwitchOff(popkin.Id, feature, clock.GetUtcNow()));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        await snapshot.RefreshIfStaleAsync(cancellationToken);
        return PopkinFeaturesDto.Of(features, popkin.Id);
    }
}

/// <summary>The features a Popkin not yet created is offered: those on for Everyone, Plan first (L2-152 AC8).</summary>
public sealed record NewPopkinFeaturesDto(IReadOnlyList<Feature> Offered);

public sealed record GetNewPopkinFeaturesQuery : IRequest<NewPopkinFeaturesDto>;

public sealed class GetNewPopkinFeaturesQueryHandler(IFeatureSwitches features)
    : IRequestHandler<GetNewPopkinFeaturesQuery, NewPopkinFeaturesDto>
{
    public Task<NewPopkinFeaturesDto> Handle(GetNewPopkinFeaturesQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(new NewPopkinFeaturesDto(new[] { Feature.Plan, Feature.Schedules }.Where(features.IsOfferedToNew).ToList()));
}
