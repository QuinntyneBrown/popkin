using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Plan;

namespace Popkin.Api.Controllers;

/// <summary>The Plan tab of a Popkin: the plan board, its stories and the burn-down (L1-017). Every action needs a session.</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/plan")]
public sealed class PlanController(ISender sender) : ControllerBase
{
    /// <summary>The plan board (L2-068): the sprint, every story and how the sprint is going.</summary>
    [HttpGet]
    public async Task<ActionResult<PlanBoardDto>> GetBoard(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPlanBoardQuery(popkinId), cancellationToken));
}
