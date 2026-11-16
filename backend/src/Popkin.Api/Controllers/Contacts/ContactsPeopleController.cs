using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Contacts.People;
using Popkin.Application.Invites;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>The people a person keeps in Contacts (L1-031). Only the caller's own are ever seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts/people")]
public sealed class ContactsPeopleController(ISender sender) : ControllerBase
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Add someone (L2-129): the part `contact` holds <see cref="SaveContactRequest"/> as JSON.
    /// The optional part `photo` is their photo. A resend under the same client id answers the
    /// contact the first made.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    public async Task<ActionResult<ContactProfileDto>> Add([FromForm] string contact, IFormFile? photo, CancellationToken cancellationToken)
    {
        await using var content = photo?.OpenReadStream();
        var upload = photo is null ? null : new PhotoUpload(content!, photo.Length);
        var added = await sender.Send(
            new AddContactCommand(JsonSerializer.Deserialize<SaveContactRequest>(contact, Json)!, upload), cancellationToken);
        return Created($"/api/contacts/people/{added.Id}", added);
    }

    /// <summary>One contact of the caller's (L2-128, L2-130); anyone else's is not found (L2-122 AC1).</summary>
    [HttpGet("{contactId:guid}")]
    public Task<ContactProfileDto> Get(Guid contactId, CancellationToken cancellationToken) =>
        sender.Send(new GetContactQuery(contactId), cancellationToken);

    /// <summary>Edit (L2-130): the part `contact` as Add someone sends it, without a photo.</summary>
    [HttpPut("{contactId:guid}")]
    public Task<ContactProfileDto> Edit(Guid contactId, [FromForm] string contact, CancellationToken cancellationToken) =>
        sender.Send(new EditContactCommand(contactId, JsonSerializer.Deserialize<SaveContactRequest>(contact, Json)!), cancellationToken);
}
