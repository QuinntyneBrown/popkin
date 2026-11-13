using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Chat;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's chat threads. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/threads")]
public sealed class ThreadsController(ISender sender) : ControllerBase
{
    /// <summary>The Everyone thread, which every member shares (L2-021).</summary>
    [HttpGet("everyone")]
    public async Task<ActionResult<ThreadDto>> GetEveryone(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetEveryoneThreadQuery(popkinId), cancellationToken));

    /// <summary>The latest of Everyone and how much of it is new, for the Popkin home (L2-019 AC3).</summary>
    [HttpGet("everyone/preview")]
    public async Task<ActionResult<ChatPreviewDto>> GetEveryonePreview(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetEveryonePreviewQuery(popkinId), cancellationToken));

    /// <summary>
    /// The direct message with another member, named by their membership id (L2-023): 200 with
    /// the one the two have, 201 when this opens it. Only the two of them can read it.
    /// </summary>
    [HttpPut("direct/{memberId:guid}")]
    public async Task<ActionResult<ThreadDto>> OpenDirect(Guid popkinId, Guid memberId, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new OpenDirectThreadCommand(popkinId, memberId), cancellationToken);
        return result.Created ? Created($"/api/popkins/{popkinId}/threads/direct/{memberId}", result.Thread) : Ok(result.Thread);
    }

    public sealed record MarkReadRequest(Guid? LastReadMessageId);

    /// <summary>Moves the caller's read point forward to a message; it never moves back (L2-027 AC4).</summary>
    [HttpPut("{threadId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid popkinId, Guid threadId, MarkReadRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new MarkThreadReadCommand(popkinId, threadId, request.LastReadMessageId), cancellationToken);
        return NoContent();
    }
}
