using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Photos;

namespace Popkin.Api.Controllers;

/// <summary>
/// Stored photo files. The signed, expiring address is the proof of the right to read one
/// (L2-051 AC2), so no session is asked for: the invite screen shows avatars to a visitor.
/// </summary>
[ApiController]
[Route("api/files")]
public sealed class FilesController(ISender sender) : ControllerBase
{
    [HttpGet("{**key}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(
        string key, [FromQuery] long expires, [FromQuery] string? signature, [FromQuery] string? download, CancellationToken cancellationToken)
    {
        var file = await sender.Send(new GetPhotoFileQuery(key, expires, signature, download), cancellationToken);
        // The address stops working when it expires; the browser may keep the bytes that long, no proxy may.
        Response.Headers.CacheControl = $"private, max-age={(int)PhotoUrlSigner.Lifetime.TotalSeconds}";
        // An address signed with a file name downloads under it, as the zip of an album does (L2-046 AC4).
        return download is null ? File(file.Content, file.ContentType) : File(file.Content, file.ContentType, download);
    }
}
