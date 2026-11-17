using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>Reminders (L2-140): the caller's own, their zone and their devices (L2-122, ADR 0028).</summary>
[ApiController]
[Route("api/contacts")]
public sealed class ContactRemindersController(ISender sender) : ControllerBase
{
    /// <summary>The undismissed in-app reminders, oldest first (L2-140 AC1).</summary>
    [HttpGet("reminders")]
    public Task<IReadOnlyList<ContactReminderDto>> Reminders(CancellationToken cancellationToken) =>
        sender.Send(new GetContactRemindersQuery(), cancellationToken);

    [HttpPost("reminders/{reminderId:guid}/dismissal")]
    public async Task<IActionResult> Dismiss(Guid reminderId, CancellationToken cancellationToken)
    {
        await sender.Send(new DismissContactReminderCommand(reminderId), cancellationToken);
        return NoContent();
    }

    /// <summary>The device's IANA zone: reminders come at 9 am there.</summary>
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
