using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Invites;

namespace Popkin.Api.Controllers;

/// <summary>Invites, reached through a Popkin's invite code. Codes tried are limited per address (L2-053 AC3).</summary>
[ApiController]
[Route("api/invites")]
[EnableRateLimiting(RateLimitPolicyNames.InviteCodes)]
public sealed class InvitesController(ISender sender) : ControllerBase
{
    /// <summary>
    /// The invite preview: the only Popkin read open without a session (L2-050 AC1), and the only
    /// one a person who is not a member can make (L2-012, L2-051 AC5).
    /// </summary>
    [HttpGet("{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<InvitePreviewDto>> GetPreview(string code, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetInvitePreviewQuery(code), cancellationToken));
}
