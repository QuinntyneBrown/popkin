using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;

namespace Popkin.Api.Controllers.Administration;

/// <summary>What the console's frame reads besides the signed-in admin.</summary>
[Route("api/admin")]
public sealed class AdminShellController(ISender sender) : AdminControllerBase
{
    /// <summary>The waiting counts beside Reports, Jobs and Album exports, read every 60 seconds.</summary>
    [HttpGet("waiting")]
    public async Task<ActionResult<AdminWaitingDto>> GetWaiting(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminWaitingQuery(), cancellationToken));
}
