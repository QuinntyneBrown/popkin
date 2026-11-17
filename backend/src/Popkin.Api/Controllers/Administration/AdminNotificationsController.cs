using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration.Notifications;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Notifications: member email, kinds off for everyone, holds and defaults (L2-169 to L2-173).</summary>
[Route("api/admin/notifications")]
public sealed class AdminNotificationsController(ISender sender) : AdminControllerBase
{
    public sealed record ReasonRequest(string? Reason);

    [HttpGet]
    public async Task<ActionResult<AdminNotificationsDto>> GetNotifications(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminNotificationsQuery(), cancellationToken));

    [HttpPost("pause")]
    public async Task<ActionResult<AdminSendStatusDto>> Pause(ReasonRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new PauseMemberEmailCommand(request.Reason), cancellationToken));

    [HttpPost("resume")]
    public async Task<ActionResult<AdminSendStatusDto>> Resume(ReasonRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ResumeMemberEmailCommand(request.Reason), cancellationToken));
}
