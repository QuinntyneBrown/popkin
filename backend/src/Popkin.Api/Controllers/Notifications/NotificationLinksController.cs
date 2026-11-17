using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Notifications;
using Popkin.Application.Problems;

namespace Popkin.Api.Controllers.Notifications;

/// <summary>
/// "Unsubscribe from all email" and the mail client's one-click button (RFC 8058, L2-168): no
/// session, the token is the proof. Only a POST changes anything; a GET answers 405.
/// </summary>
[ApiController]
[Route("api/notifications")]
public sealed class NotificationLinksController(ISender sender) : ControllerBase
{
    public sealed record UnsubscribedDto(bool Unsubscribed);

    /// <summary>
    /// With the form body `List-Unsubscribe=One-Click` (a mail client) or none (the page): 200;
    /// 410 `unsubscribe_link_expired` whatever made the token fail (AC5); 429 `rate_limited`.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("unsubscribe")]
    [EnableRateLimiting(RateLimitPolicyNames.Unsubscribe)]
    public async Task<ActionResult<UnsubscribedDto>> Unsubscribe([FromQuery(Name = "t")] string? token, CancellationToken cancellationToken)
    {
        var outcome = await sender.Send(new UnsubscribeFromAllEmailCommand(token), cancellationToken);
        if (outcome == UnsubscribeOutcome.Expired)
        {
            throw new ProblemException(410, "unsubscribe_link_expired", "This link has expired. Sign in to change your email settings.");
        }

        return Ok(new UnsubscribedDto(true));
    }

    /// <summary>A link scanner's GET changes nothing: 405, with `Allow: POST` (L2-168 AC3).</summary>
    [AllowAnonymous]
    [HttpGet("unsubscribe")]
    public IActionResult UnsubscribeByGet()
    {
        Response.Headers.Allow = "POST";
        return StatusCode(StatusCodes.Status405MethodNotAllowed);
    }
}
