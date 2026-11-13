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

    /// <summary>Shares an experience: a title, a kind and, when given, a when and a place (L2-040).</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ExperienceCardDto>> Share(
        Guid popkinId, [FromForm] string? title, [FromForm] string? kind, [FromForm] string? when, [FromForm] string? place,
        CancellationToken cancellationToken)
    {
        var card = await sender.Send(new ShareExperienceCommand(popkinId, title, kind, when, place), cancellationToken);
        return Created($"/api/popkins/{popkinId}/experiences/{card.Id}", card);
    }
}
