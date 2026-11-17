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

    public sealed record KindRequest(bool? Email, bool? Phone);

    /// <summary>One kind by email, by phone or both (L2-157 AC3): 400 `invalid_kind`, `notification_required` or `nothing_to_change`.</summary>
    [HttpPut("kinds/{kind}")]
    public async Task<IActionResult> SetKind(string kind, KindRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetNotificationKindCommand(kind, request.Email, request.Phone), cancellationToken);
        return NoContent();
    }

    public sealed record EmailRequest(bool? On);

    /// <summary>Activity email on or off (L2-156 AC3, AC4): 409 `no_email_address` to turn it on without one (AC5).</summary>
    [HttpPut("email")]
    public async Task<IActionResult> SetEmail(EmailRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetActivityEmailCommand(request.On), cancellationToken);
        return NoContent();
    }

    public sealed record FrequencyRequest(string? Frequency);

    /// <summary>How often activity email comes (L2-156 AC1): 400 `invalid_frequency`.</summary>
    [HttpPut("frequency")]
    public async Task<IActionResult> SetFrequency(FrequencyRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetActivityFrequencyCommand(request.Frequency), cancellationToken);
        return NoContent();
    }
}
