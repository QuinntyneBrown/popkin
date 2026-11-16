using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Contacts.People;
using Popkin.Application.Contacts.Profile;
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

    /// <summary>People (L2-126): every contact of the caller's, A to Z, for the device's day `on` (yyyy-MM-dd).</summary>
    [HttpGet]
    public Task<PeopleDto> List([FromQuery] string? on, CancellationToken cancellationToken) =>
        sender.Send(new GetPeopleQuery(on), cancellationToken);

    /// <summary>One contact of the caller's (L2-128, L2-130); anyone else's is not found (L2-122 AC1).</summary>
    [HttpGet("{contactId:guid}")]
    public Task<ContactProfileDto> Get(Guid contactId, CancellationToken cancellationToken) =>
        sender.Send(new GetContactQuery(contactId), cancellationToken);

    /// <summary>Deletes the contact and what was kept about them (L2-132); 404 for one not the caller's.</summary>
    [HttpDelete("{contactId:guid}")]
    public async Task<IActionResult> Delete(Guid contactId, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteContactCommand(contactId), cancellationToken);
        return NoContent();
    }

    /// <summary>Into Closest (L2-131 AC4); one already in it is left as it is.</summary>
    [HttpPut("{contactId:guid}/closest")]
    public async Task<IActionResult> JoinClosest(Guid contactId, CancellationToken cancellationToken)
    {
        await sender.Send(new AddToClosestCommand(contactId), cancellationToken);
        return NoContent();
    }

    /// <summary>Out of Closest (L2-131 AC2); they stay in People and their circle.</summary>
    [HttpDelete("{contactId:guid}/closest")]
    public async Task<IActionResult> LeaveClosest(Guid contactId, CancellationToken cancellationToken)
    {
        await sender.Send(new TakeOutOfClosestCommand(contactId), cancellationToken);
        return NoContent();
    }

    /// <summary>Edit (L2-130): the part `contact` as Add someone sends it, and an optional `photo` that replaces theirs.</summary>
    [HttpPut("{contactId:guid}")]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    public async Task<ContactProfileDto> Edit(Guid contactId, [FromForm] string contact, IFormFile? photo, CancellationToken cancellationToken)
    {
        await using var content = photo?.OpenReadStream();
        var upload = photo is null ? null : new PhotoUpload(content!, photo.Length);
        return await sender.Send(
            new EditContactCommand(contactId, JsonSerializer.Deserialize<SaveContactRequest>(contact, Json)!, upload), cancellationToken);
    }
}
