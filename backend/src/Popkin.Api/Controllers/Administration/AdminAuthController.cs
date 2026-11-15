using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.Auth;
using Popkin.Api.RateLimiting;
using Popkin.Application.Administration.Auth;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Signing in to the admin app with a code sent to a staff email (L2-088).</summary>
[Route("api/admin/auth")]
public sealed class AdminAuthController(ISender sender) : AdminControllerBase
{
    public sealed record RequestAdminCodeRequest(string? Email);

    /// <summary>Sends a code to any whole email, the same answer for every one (L2-088 AC3).</summary>
    [HttpPost("codes")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.CodesPerAddress)]
    public async Task<ActionResult<AdminCodeSentDto>> RequestCode(RequestAdminCodeRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new RequestAdminCodeCommand(request.Email), cancellationToken));

    public sealed record ConfirmAdminCodeRequest(string? Code);

    /// <summary>Confirms six digits and starts an admin session (L2-088 AC4).</summary>
    [HttpPost("codes/{verificationId:guid}/confirm")]
    [AllowAnonymous]
    public async Task<ActionResult<AdminMeDto>> ConfirmCode(Guid verificationId, ConfirmAdminCodeRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new ConfirmAdminCodeCommand(verificationId, request.Code), cancellationToken);
        await AdminSessionCookie.SignInAsync(HttpContext, result.Started);
        return Ok(result.Admin);
    }

    /// <summary>Sends a new code once 30 seconds have passed (L2-088 AC7).</summary>
    [HttpPost("codes/{verificationId:guid}/resend")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicyNames.CodesPerAddress)]
    public async Task<ActionResult<AdminCodeSentDto>> ResendCode(Guid verificationId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ResendAdminCodeCommand(verificationId), cancellationToken));

    /// <summary>Ends the admin session and clears the admin cookie only (L2-088 AC8).</summary>
    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await sender.Send(new AdminSignOutCommand(), cancellationToken);
        await AdminSessionCookie.SignOutAsync(HttpContext);
        return NoContent();
    }
}
