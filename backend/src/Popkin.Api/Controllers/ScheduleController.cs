using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Schedules;

namespace Popkin.Api.Controllers;

/// <summary>The Schedule tab of a Popkin: time off and this week (L1-018). Every action needs a session.</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/schedule")]
public sealed class ScheduleController(ISender sender) : ControllerBase
{
    /// <summary>
    /// A week of the group's time off (L2-072): `week` names it by any of its days; without it,
    /// the event's week, or else the week of the viewer's `today`.
    /// </summary>
    [HttpGet("time-off")]
    public async Task<ActionResult<TimeOffWeekDto>> GetTimeOff(
        Guid popkinId, [FromQuery] DateOnly? week, [FromQuery] DateOnly? today, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetTimeOffWeekQuery(popkinId, week, today), cancellationToken));

}
