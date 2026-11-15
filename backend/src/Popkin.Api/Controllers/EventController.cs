using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Schedules;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's event, which time off marks (L2-085). The Host's alone; every action needs a session.</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/event")]
public sealed class EventController(ISender sender) : ControllerBase
{
    /// <summary>Sets the event: its label and its first and last day. Counted with messages.</summary>
    [HttpPut]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<EventDto>> SetEvent(Guid popkinId, SetEventRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SetEventCommand(popkinId, request.Label, request.FirstDay, request.LastDay), cancellationToken));

    /// <summary>Removes the event. Counted with messages.</summary>
    [HttpDelete]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<IActionResult> RemoveEvent(Guid popkinId, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveEventCommand(popkinId), cancellationToken);
        return NoContent();
    }
}
