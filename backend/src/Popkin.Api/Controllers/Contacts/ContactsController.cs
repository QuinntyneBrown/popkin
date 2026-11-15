using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Summary;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>A person's own Contacts (L1-029). Every action needs a session and sees only the caller's contacts.</summary>
[ApiController]
[Route("api/contacts")]
public sealed class ContactsController(ISender sender) : ControllerBase
{
    /// <summary>How many contacts the caller keeps; 404 `feature_off` while Contacts is switched off (L2-121).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ContactsSummaryDto>> GetSummary(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetContactsSummaryQuery(), cancellationToken));
}
