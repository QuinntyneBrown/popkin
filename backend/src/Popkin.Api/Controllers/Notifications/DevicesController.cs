using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Notifications.Devices;

namespace Popkin.Api.Controllers.Notifications;

/// <summary>
/// Where the caller is and the devices that take their phone alerts (L2-161 AC7, ADR 0028). They
/// serve every kind of notification, so no feature switch guards them.
/// </summary>
[ApiController]
[Route("api/me")]
public sealed class DevicesController(ISender sender) : ControllerBase
{
    /// <summary>The device's IANA zone, sent once when the web app starts; 400 `invalid_time_zone`.</summary>
    [HttpPut("time-zone")]
    public async Task<IActionResult> SaveTimeZone(SaveTimeZoneRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SaveTimeZoneCommand(request), cancellationToken);
        return NoContent();
    }

    [HttpGet("push-key")]
    public Task<PushKeyDto> PushKey(CancellationToken cancellationToken) =>
        sender.Send(new GetPushKeyQuery(), cancellationToken);

    [HttpPost("push-subscriptions")]
    public async Task<IActionResult> Subscribe(SavePushSubscriptionRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SavePushSubscriptionCommand(request), cancellationToken);
        return NoContent();
    }

    [HttpDelete("push-subscriptions")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string? endpoint, CancellationToken cancellationToken)
    {
        await sender.Send(new RemovePushSubscriptionCommand(endpoint), cancellationToken);
        return NoContent();
    }
}
