using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>Reminders (L2-140): the caller's own (L2-122). Their zone and devices are under /api/me.</summary>
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
}
