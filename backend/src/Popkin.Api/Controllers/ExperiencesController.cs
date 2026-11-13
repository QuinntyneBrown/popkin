using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
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
    /// refused with its own message and not by the server's size limit. At most 60 a minute per
    /// person, counted with the photos they add.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
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

    /// <summary>
    /// Changes an experience, for its sharer only (L2-040 AC6): each field is optional, a field
    /// that is not sent stays as it is, and `removePicture` leaves it without a picture. Counted
    /// with sharing.
    /// </summary>
    [HttpPatch("{experienceId:guid}")]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(2 * Photo.MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * Photo.MaxFileBytes)]
    public async Task<ActionResult<ExperienceCardDto>> Edit(
        Guid popkinId, Guid experienceId, IFormFile? picture, [FromForm] bool removePicture, CancellationToken cancellationToken)
    {
        // Read from the form itself: a field sent empty is not a field that was not sent.
        var form = await Request.ReadFormAsync(cancellationToken);
        string? Sent(string field) => form.TryGetValue(field, out var value) ? value.ToString() : null;

        await using var content = picture?.OpenReadStream();
        var upload = picture is null ? null : new PhotoUpload(content!, picture.Length);
        return Ok(await sender.Send(
            new EditExperienceCommand(popkinId, experienceId, Sent("title"), Sent("kind"), Sent("when"), Sent("place"), upload, removePicture),
            cancellationToken));
    }

    /// <summary>Deletes an experience with its ratings and comments, for its sharer or the Host (L2-040 AC6).</summary>
    [HttpDelete("{experienceId:guid}")]
    public async Task<IActionResult> Delete(Guid popkinId, Guid experienceId, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteExperienceCommand(popkinId, experienceId), cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Sets the caller's one rating of an experience, from one to five stars, and answers the
    /// group's score with it (L2-039). At most 60 a minute per person, counted with their messages.
    /// </summary>
    [HttpPut("{experienceId:guid}/my-rating")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<RatingResultDto>> Rate(Guid popkinId, Guid experienceId, RateExperienceRequest request, CancellationToken cancellationToken)
    {
        // Anything but a whole number is no stars at all, and the handler says so.
        int? stars = request.Stars is { ValueKind: JsonValueKind.Number } value && value.TryGetInt32(out var whole) ? whole : null;
        return Ok(await sender.Send(new RateExperienceCommand(popkinId, experienceId, stars), cancellationToken));
    }

    /// <summary>
    /// Says the caller is keen on something the group wants to do (L2-042 AC2) and answers who is
    /// keen. Repeating it changes nothing. Counted with rating.
    /// </summary>
    [HttpPut("{experienceId:guid}/keen")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<KeenDto>> Keen(Guid popkinId, Guid experienceId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SetKeenCommand(popkinId, experienceId, Keen: true), cancellationToken));

    /// <summary>Takes back the caller's keen (L2-042 AC3) and answers who is keen. Counted with rating.</summary>
    [HttpDelete("{experienceId:guid}/keen")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<KeenDto>> NotKeen(Guid popkinId, Guid experienceId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SetKeenCommand(popkinId, experienceId, Keen: false), cancellationToken));

    /// <summary>
    /// "We did this": turns an idea into something the group did, for its sharer or the Host
    /// (L2-042 AC4), and answers the experience as its page shows it. Counted with rating.
    /// </summary>
    [HttpPost("{experienceId:guid}/done")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<ExperienceDetailDto>> MarkDone(Guid popkinId, Guid experienceId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new MarkExperienceDoneCommand(popkinId, experienceId), cancellationToken));

    /// <summary>Adds a few words to the caller's rating, or replaces the ones they had (L2-041), counted with rating.</summary>
    [HttpPut("{experienceId:guid}/my-rating/comment")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<ExperienceCommentDto>> Comment(
        Guid popkinId, Guid experienceId, CommentOnExperienceRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new CommentOnExperienceCommand(popkinId, experienceId, request.Text), cancellationToken));
}

public sealed record CommentOnExperienceRequest(string? Text);

public sealed record RateExperienceRequest(JsonElement? Stars);
