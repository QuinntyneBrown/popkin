using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Auth;
using Popkin.Domain;

namespace Popkin.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(ISender sender) : ControllerBase
{
    public sealed record RequestCodeRequest(CodePurpose Purpose, ContactChannel Channel, string? Destination);

    /// <summary>Sends a six-digit code (L2-003 AC3). Anonymous (L2-050 AC1), limited per address (L2-053 AC1).</summary>
    [HttpPost("codes")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.CodesPerAddress)]
    public async Task<ActionResult<CodeSentDto>> RequestCode(RequestCodeRequest request, CancellationToken cancellationToken)
    {
        var sent = await sender.Send(new RequestCodeCommand(request.Purpose, request.Channel, request.Destination), cancellationToken);
        return Accepted(sent);
    }
}
