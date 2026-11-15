using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Features: who has Plan and Schedules, set by an Owner (L2-076).</summary>
[Route("api/admin/features")]
public sealed class AdminFeaturesController(ISender sender) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminFeaturesDto>> GetFeatures(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminFeaturesQuery(), cancellationToken));

    public sealed record ChangeModeRequest(string? Mode, string? Reason);

    [HttpPut("{feature}")]
    public async Task<ActionResult<AdminFeatureDto>> ChangeMode(string feature, ChangeModeRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ChangeFeatureModeCommand(feature, request.Mode, request.Reason), cancellationToken));

    public sealed record AddPopkinRequest(Guid PopkinId, string? Reason);

    [HttpPost("{feature}/popkins")]
    public async Task<ActionResult<AdminFeatureDto>> AddPopkin(string feature, AddPopkinRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new AddFeaturePopkinCommand(feature, request.PopkinId, request.Reason), cancellationToken));

    [HttpDelete("{feature}/popkins/{popkinId:guid}")]
    public async Task<ActionResult<AdminFeatureDto>> RemovePopkin(string feature, Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new RemoveFeaturePopkinCommand(feature, popkinId), cancellationToken));

    [HttpGet("{feature}/popkins/search")]
    public async Task<ActionResult<IReadOnlyList<FeaturePopkinMatchDto>>> SearchPopkins(string feature, [FromQuery] string? q, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SearchFeaturePopkinsQuery(feature, q), cancellationToken));
}
