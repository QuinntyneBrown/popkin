using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Members;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's members. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/members")]
public sealed class MembersController(ISender sender) : ControllerBase
{
    /// <summary>The members, the Host first; names and avatars only (L2-019 AC6, L2-054 AC2).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MemberDto>>> Get(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetMembersQuery(popkinId), cancellationToken));

    /// <summary>The caller leaves the Popkin; what they added stays (L2-047).</summary>
    [HttpDelete("me")]
    public async Task<IActionResult> LeaveMe(Guid popkinId, CancellationToken cancellationToken)
    {
        await sender.Send(new LeavePopkinCommand(popkinId), cancellationToken);
        return NoContent();
    }
}
