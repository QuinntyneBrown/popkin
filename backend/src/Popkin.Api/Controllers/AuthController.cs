using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.Auth;
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

    public sealed record ConfirmCodeRequest(string? Code, string? Name);

    public sealed record ConfirmCodeResponse(ConfirmOutcome Outcome, SessionDto? Session, bool IsNewPerson);

    /// <summary>Confirms six digits and starts a session (L2-004 AC2). Anonymous (L2-050 AC1).</summary>
    [HttpPost("codes/{verificationId:guid}/confirm")]
    [AllowAnonymous]
    public async Task<ActionResult<ConfirmCodeResponse>> ConfirmCode(Guid verificationId, ConfirmCodeRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ConfirmCodeCommand(verificationId, request.Code, request.Name), cancellationToken);
        if (result.Started is { } started)
        {
            await SessionCookie.SignInAsync(HttpContext, started);
        }

        return Ok(new ConfirmCodeResponse(result.Outcome, result.Session, result.IsNewPerson));
    }

    /// <summary>Sends a new code once 30 seconds have passed (L2-005 AC1, AC2).</summary>
    [HttpPost("codes/{verificationId:guid}/resend")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.CodesPerAddress)]
    public async Task<ActionResult<CodeSentDto>> ResendCode(Guid verificationId, CancellationToken cancellationToken) =>
        Accepted(await sender.Send(new ResendCodeCommand(verificationId), cancellationToken));

    /// <summary>The signed-in person; 401 without a live session (the fallback policy answers).</summary>
    [HttpGet("session")]
    public async Task<ActionResult<SessionDto>> GetSession(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetSessionQuery(), cancellationToken));
}
