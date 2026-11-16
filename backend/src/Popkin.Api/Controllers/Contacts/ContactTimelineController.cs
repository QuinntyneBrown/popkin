using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Timeline;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>What passes between a person and a contact (L1-032). Only the caller's own contacts (L2-122).</summary>
[ApiController]
[Route("api/contacts/people/{contactId:guid}")]
public sealed class ContactTimelineController(ISender sender) : ControllerBase
{
    /// <summary>Log a conversation (L2-133): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost("conversations")]
    public async Task<ActionResult<TimelineEntryDto>> LogConversation(
        Guid contactId, LogConversationRequest conversation, CancellationToken cancellationToken) =>
        Answer(contactId, await sender.Send(new LogConversationCommand(contactId, conversation), cancellationToken));

    /// <summary>Log a milestone (L2-134): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost("milestones")]
    public async Task<ActionResult<TimelineEntryDto>> LogMilestone(
        Guid contactId, LogMilestoneRequest milestone, CancellationToken cancellationToken) =>
        Answer(contactId, await sender.Send(new LogMilestoneCommand(contactId, milestone), cancellationToken));

    /// <summary>A contact's history (L2-135 AC1): newest first, filtered by kind.</summary>
    [HttpGet("timeline")]
    public Task<TimelineDto> Timeline(Guid contactId, [FromQuery] TimelineShow show, CancellationToken cancellationToken) =>
        sender.Send(new GetContactTimelineQuery(contactId, show), cancellationToken);

    private ActionResult<TimelineEntryDto> Answer(Guid contactId, LoggedEntry logged) =>
        logged.Created
            ? Created($"/api/contacts/people/{contactId}/timeline", logged.Entry)
            : Ok(logged.Entry);
}
