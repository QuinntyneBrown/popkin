using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Notifications.Settings;

namespace Popkin.Api.Controllers.Notifications;

/// <summary>
/// The signed-in person's own notification settings (L2-155), authenticated by the fallback policy.
/// No route names another person, so nobody reads or changes anyone else's (L2-174 AC4).
/// </summary>
[ApiController]
[Route("api/me/notifications")]
public sealed class NotificationSettingsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<NotificationSettingsDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetNotificationSettingsQuery(), cancellationToken));
}
