using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;
using Popkin.Application.Administration.Auth;

namespace Popkin.Api.Controllers.Administration;

[Route("api/admin")]
public sealed class AdminMeController(ISender sender) : AdminControllerBase
{
    /// <summary>The signed-in admin.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<AdminMeDto>> GetMe(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminMeQuery(), cancellationToken));

    /// <summary>What each role can do, with the number of admins in each (L2-086 AC4).</summary>
    [HttpGet("roles")]
    public async Task<ActionResult<AdminRolesDto>> GetRoles(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminRolesQuery(), cancellationToken));
}
