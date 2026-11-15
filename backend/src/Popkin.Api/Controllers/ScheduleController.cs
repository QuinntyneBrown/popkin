using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
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

    /// <summary>
    /// Sets the caller's own time off for a week, Monday to Friday (L2-073), and answers the week.
    /// Counted with messages.
    /// </summary>
    [HttpPut("time-off/{membershipId:guid}")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<TimeOffWeekDto>> SetTimeOff(
        Guid popkinId, Guid membershipId, SetTimeOffRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SetTimeOffCommand(popkinId, membershipId, request.Week, request.Days), cancellationToken));

    /// <summary>
    /// This week (L2-074): seven days from `from`, the viewer's today, each evening's free count
    /// and everyone's working stretches.
    /// </summary>
    [HttpGet("week")]
    public async Task<ActionResult<ThisWeekDto>> GetThisWeek(Guid popkinId, [FromQuery] DateOnly? from, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetThisWeekQuery(popkinId, from), cancellationToken));

}
