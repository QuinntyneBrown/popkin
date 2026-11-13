using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Experiences;
using Popkin.Application.Invites;
using Popkin.Domain;

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

    /// <summary>
    /// The experiences as cards, the newest first (L2-037): `all` of them, what the group `did`,
    /// restaurants included, or what it `want`s to do.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ExperienceCardDto>>> List(Guid popkinId, [FromQuery] string? filter, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetExperiencesQuery(popkinId, filter), cancellationToken));

    /// <summary>One experience with the group's score and what people said, for its page (L2-038).</summary>
    [HttpGet("{experienceId:guid}")]
    public async Task<ActionResult<ExperienceDetailDto>> Get(Guid popkinId, Guid experienceId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetExperienceQuery(popkinId, experienceId), cancellationToken));

    /// <summary>
    /// Shares an experience: a title, a kind and, when given, a when, a place and a picture
    /// (L2-040). The body may be up to twice the largest picture, so a picture over 10 MB is
    /// refused with its own message and not by the server's size limit.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(2 * Photo.MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * Photo.MaxFileBytes)]
    public async Task<ActionResult<ExperienceCardDto>> Share(
        Guid popkinId, [FromForm] string? title, [FromForm] string? kind, [FromForm] string? when, [FromForm] string? place, IFormFile? picture,
        CancellationToken cancellationToken)
    {
        await using var content = picture?.OpenReadStream();
        var upload = picture is null ? null : new PhotoUpload(content!, picture.Length);
        var card = await sender.Send(new ShareExperienceCommand(popkinId, title, kind, when, place, upload), cancellationToken);
        return Created($"/api/popkins/{popkinId}/experiences/{card.Id}", card);
    }
}
