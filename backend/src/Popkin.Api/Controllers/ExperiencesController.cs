using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Experiences;

namespace Popkin.Api.Controllers;

/// <summary>A Popkin's experiences. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/experiences")]
public sealed class ExperiencesController(ISender sender) : ControllerBase
{
    /// <summary>How many experiences there are and the highest rated, for the Popkin home (L2-019 AC5).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ExperiencesSummaryDto>> GetSummary(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetExperiencesSummaryQuery(popkinId), cancellationToken));
}
