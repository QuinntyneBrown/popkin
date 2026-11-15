using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>Which switched features this Popkin has, read by its open screens every 60 seconds (L2-076 AC10, L2-077 AC4).</summary>
public sealed record PopkinFeaturesDto(bool Plan, bool Schedules);

public sealed record GetPopkinFeaturesQuery(Guid PopkinId) : IRequest<PopkinFeaturesDto>;

public sealed class GetPopkinFeaturesQueryHandler(IMembershipGuard guard, IFeatureSwitches features)
    : IRequestHandler<GetPopkinFeaturesQuery, PopkinFeaturesDto>
{
    public async Task<PopkinFeaturesDto> Handle(GetPopkinFeaturesQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        return new PopkinFeaturesDto(features.IsOn(Feature.Plan, popkin.Id), features.IsOn(Feature.Schedules, popkin.Id));
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
