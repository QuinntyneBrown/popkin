using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Dates;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>The key dates a person keeps about their contacts (L1-033). Only the caller's own are seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts")]
public sealed class KeyDatesController(ISender sender) : ControllerBase
{
    /// <summary>Dates (L2-137): every next occurrence within a year, soonest first, for the device's day `on`.</summary>
    [HttpGet("dates")]
    public Task<ContactDatesDto> List([FromQuery] string? on, [FromQuery] string? kind, CancellationToken cancellationToken) =>
        sender.Send(new GetContactDatesQuery(on, kind), cancellationToken);

    /// <summary>One date's own reminder (L2-139 AC3).</summary>
    [HttpPut("key-dates/{keyDateId:guid}/reminder")]
    public Task<ContactKeyDateDto> ChangeReminder(Guid keyDateId, ChangeReminderRequest request, CancellationToken cancellationToken) =>
        sender.Send(new ChangeKeyDateReminderCommand(keyDateId, request.Lead), cancellationToken);

    /// <summary>Removes one key date; 404 `key_date_not_found` for one not the caller's.</summary>
    [HttpDelete("key-dates/{keyDateId:guid}")]
    public async Task<IActionResult> Remove(Guid keyDateId, CancellationToken cancellationToken)
    {
        await sender.Send(new RemoveKeyDateCommand(keyDateId), cancellationToken);
        return NoContent();
    }

    /// <summary>The caller's default lead times and reminder ways (L2-139, L2-140).</summary>
    [HttpGet("reminder-preferences")]
    public Task<ReminderPreferencesDto> GetPreferences(CancellationToken cancellationToken) =>
        sender.Send(new GetReminderPreferencesQuery(), cancellationToken);

    /// <summary>Saves the caller's defaults; no kept date changes (L2-139 AC2).</summary>
    [HttpPut("reminder-preferences")]
    public Task<ReminderPreferencesDto> SavePreferences(SaveReminderPreferencesRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SaveReminderPreferencesCommand(request), cancellationToken);
}
