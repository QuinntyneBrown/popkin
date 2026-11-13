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
}
