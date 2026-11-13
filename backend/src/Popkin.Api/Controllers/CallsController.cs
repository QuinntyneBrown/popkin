using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Calls;

namespace Popkin.Api.Controllers;

/// <summary>
/// A Popkin's group call, and the direct call of each direct message, named by its thread.
/// Every action needs a session and a membership (L2-050, L2-051).
/// </summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/calls")]
public sealed class CallsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// The microphone and the camera are on unless the member arrives with one off. `ThreadId`
    /// names a direct message for its direct call; without it the call is the group call.
    /// </summary>
    public sealed record JoinCallRequest(bool? MicOn, bool? CameraOn, Guid? ThreadId);

    public sealed record SetCallMediaRequest(bool? MicOn, bool? CameraOn);

    /// <summary>
    /// The group call under way, for the call banner (L2-029 AC2), or with `threadId` the direct
    /// call of that direct message (L2-030 AC8); 204 when there is none.
    /// </summary>
    [HttpGet("current")]
    public async Task<ActionResult<CallDto>> GetCurrent(Guid popkinId, [FromQuery] Guid? threadId, CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentCallQuery(popkinId, threadId), cancellationToken) is { } call ? Ok(call) : NoContent();

    /// <summary>
    /// Puts the member on the Popkin's group call (L2-029 AC1), or on the direct call of the
    /// thread named (L2-030 AC8): 201 when this starts it, 200 when they join the one under way
    /// or are on it already.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<JoinedCallDto>> Join(Guid popkinId, JoinCallRequest? request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new JoinCallCommand(popkinId, request?.MicOn ?? true, request?.CameraOn ?? true, request?.ThreadId), cancellationToken);
        var location = result.Joined.Call.ThreadId is { } threadId
            ? $"/api/popkins/{popkinId}/calls/current?threadId={threadId}"
            : $"/api/popkins/{popkinId}/calls/current";
        return result.Started ? Created(location, result.Joined) : Ok(result.Joined);
    }

    /// <summary>The member leaves the call (L2-030 AC6); when nobody remains, the call ends (L2-029 AC6).</summary>
    [HttpPost("{callId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid popkinId, Guid callId, CancellationToken cancellationToken)
    {
        await sender.Send(new LeaveCallCommand(popkinId, callId), cancellationToken);
        return NoContent();
    }

    /// <summary>Records the member's own microphone and camera on the call, each only when given (L2-030 AC5).</summary>
    [HttpPatch("{callId:guid}/participants/me")]
    public async Task<IActionResult> SetMedia(Guid popkinId, Guid callId, SetCallMediaRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetCallMediaCommand(popkinId, callId, request.MicOn, request.CameraOn), cancellationToken);
        return NoContent();
    }
}
