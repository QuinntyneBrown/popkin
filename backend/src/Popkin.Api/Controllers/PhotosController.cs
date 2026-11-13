using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Photos;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's photos. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/photos")]
public sealed class PhotosController(ISender sender) : ControllerBase
{
    /// <summary>How many photos there are and the latest few, for the Popkin home (L2-019 AC4).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<PhotosSummaryDto>> GetSummary(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPhotosSummaryQuery(popkinId), cancellationToken));
}
