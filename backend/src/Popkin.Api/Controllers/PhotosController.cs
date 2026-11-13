using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Domain;

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

    /// <summary>
    /// A page of the album, latest taken first, at most 60 photos (L2-032): everyone's or the
    /// caller's own, from the start or from the cursor the page before gave.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<AlbumPageDto>> GetAlbum(
        Guid popkinId, [FromQuery] string? filter, [FromQuery] string? cursor, [FromQuery] int? limit, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAlbumQuery(popkinId, filter, cursor, limit), cancellationToken));

    /// <summary>One photo with its display image and its neighbours in the album, for the photo view (L2-033).</summary>
    [HttpGet("{photoId:guid}")]
    public async Task<ActionResult<PhotoDetailDto>> GetPhoto(Guid popkinId, Guid photoId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPhotoQuery(popkinId, photoId), cancellationToken));

    /// <summary>
    /// Adds one photo to the album, with a caption when given (L2-031). The body may be up to
    /// twice the largest photo, so a photo over 10 MB is refused with its own message and not by
    /// the server's size limit. At most 60 a minute per person.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(2 * Photo.MaxFileBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * Photo.MaxFileBytes)]
    public async Task<ActionResult<PhotoSummaryDto>> Add(Guid popkinId, IFormFile? file, [FromForm] string? caption, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        var upload = file is null ? null : new PhotoUpload(content!, file.Length);
        var photo = await sender.Send(new AddPhotoCommand(popkinId, upload, caption), cancellationToken);
        return Created($"/api/popkins/{popkinId}/photos/{photo.Id}", photo);
    }
}
