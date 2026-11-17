using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Limits: what an Owner changes without a release (L2-117, L2-176).</summary>
[Route("api/admin/limits")]
public sealed class AdminLimitsController(ISender sender) : AdminControllerBase
{
    public sealed record ChangeLimitsRequest(IReadOnlyList<LimitChange>? Changes, string? Reason);

    [HttpGet]
    public async Task<ActionResult<AdminLimitsDto>> GetLimits(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminLimitsQuery(), cancellationToken));

    [HttpPut]
    public async Task<ActionResult<AdminLimitsDto>> ChangeLimits(ChangeLimitsRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ChangeLimitsCommand(request.Changes, request.Reason), cancellationToken));
}
