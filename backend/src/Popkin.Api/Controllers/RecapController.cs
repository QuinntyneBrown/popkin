using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.WrapUp;

namespace Popkin.Api.Controllers;

/// <summary>The recap of a wrapped-up Popkin. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/recap")]
public sealed class RecapController(ISender sender) : ControllerBase
{
    /// <summary>The recap (L2-046 AC1 to AC3); 409 `popkin_active` while the Popkin has not wrapped up.</summary>
    [HttpGet]
    public async Task<ActionResult<RecapDto>> Get(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetRecapQuery(popkinId), cancellationToken));

    /// <summary>
    /// "Save the album" (L2-046 AC4): 202 with the export to follow, which the Worker prepares.
    /// One that is being prepared, or is ready and has not expired, answers again.
    /// </summary>
    [HttpPost("album-exports")]
    public async Task<ActionResult<AlbumExportDto>> StartAlbumExport(Guid popkinId, CancellationToken cancellationToken)
    {
        var export = await sender.Send(new StartAlbumExportCommand(popkinId), cancellationToken);
        return Accepted($"/api/popkins/{popkinId}/recap/album-exports/{export.Id}", export);
    }

    /// <summary>How far the export is and, once ready, the expiring address its zip downloads from.</summary>
    [HttpGet("album-exports/{exportId:guid}")]
    public async Task<ActionResult<AlbumExportDto>> GetAlbumExport(Guid popkinId, Guid exportId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAlbumExportQuery(popkinId, exportId), cancellationToken));
}
