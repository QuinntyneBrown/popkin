using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Calls;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's group call. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/calls")]
public sealed class CallsController(ISender sender) : ControllerBase
{
    /// <summary>The microphone and the camera are on unless the member arrives with one off.</summary>
    public sealed record JoinCallRequest(bool? MicOn, bool? CameraOn);

    /// <summary>The group call under way, for the call banner (L2-029 AC2), or 204 when there is none.</summary>
    [HttpGet("current")]
    public async Task<ActionResult<CallDto>> GetCurrent(Guid popkinId, CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentCallQuery(popkinId), cancellationToken) is { } call ? Ok(call) : NoContent();

    /// <summary>
    /// Puts the member on the Popkin's group call (L2-029 AC1): 201 when this starts it, 200
    /// when they join the one under way or are on it already.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<JoinedCallDto>> Join(Guid popkinId, JoinCallRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new JoinCallCommand(popkinId, request?.MicOn ?? true, request?.CameraOn ?? true), cancellationToken);
        return result.Started ? Created($"/api/popkins/{popkinId}/calls/current", result.Joined) : Ok(result.Joined);
    }

    /// <summary>The member leaves the call (L2-030 AC6); when nobody remains, the call ends (L2-029 AC6).</summary>
    [HttpPost("{callId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid popkinId, Guid callId, CancellationToken cancellationToken)
    {
        await sender.Send(new LeaveCallCommand(popkinId, callId), cancellationToken);
        return NoContent();
    }
}
