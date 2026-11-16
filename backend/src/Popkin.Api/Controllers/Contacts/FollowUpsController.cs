using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.FollowUps;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>What a person said they would do for their contacts (L1-034). Only the caller's own are seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts/follow-ups")]
public sealed class FollowUpsController(ISender sender) : ControllerBase
{
    /// <summary>Follow-ups (L2-141): every one, open and done; the web app buckets them by the device's day.</summary>
    [HttpGet]
    public Task<IReadOnlyList<FollowUpDto>> List(CancellationToken cancellationToken) =>
        sender.Send(new GetFollowUpsQuery(), cancellationToken);

    /// <summary>"Add a follow-up" (L2-142 AC1): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost]
    public async Task<ActionResult<FollowUpDto>> Add(AddFollowUpRequest followUp, CancellationToken cancellationToken)
    {
        var added = await sender.Send(new AddFollowUpCommand(followUp), cancellationToken);
        return added.Created ? Created($"/api/contacts/follow-ups/{added.FollowUp.Id}", added.FollowUp) : Ok(added.FollowUp);
    }

    /// <summary>"Mark done" or "Mark not done" (L2-142 AC2, AC3).</summary>
    [HttpPut("{followUpId:guid}/done")]
    public Task<FollowUpDto> SetDone(Guid followUpId, SetFollowUpDoneRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SetFollowUpDoneCommand(followUpId, request.Done), cancellationToken);
}
