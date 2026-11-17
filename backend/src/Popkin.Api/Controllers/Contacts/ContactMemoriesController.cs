using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Contacts.Memories;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>
/// "Memories & files" (L2-136): photos, files and notes kept about a contact. Only the caller's
/// own contacts (L2-122). An upload's body may be up to twice the largest file, so a file over
/// 25 MB is refused with its own message and not by the server's size limit.
/// </summary>
[ApiController]
[Route("api/contacts/people/{contactId:guid}/memories")]
public sealed class ContactMemoriesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<MemoriesDto> Memories(Guid contactId, CancellationToken cancellationToken) =>
        sender.Send(new GetMemoriesQuery(contactId), cancellationToken);

    /// <summary>Keeps a photo (L2-136 AC2): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost("photos")]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(2 * Memory.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * Memory.MaxBytes)]
    public async Task<ActionResult<PhotoMemoryDto>> AddPhoto(
        Guid contactId, IFormFile? file, [FromForm] Guid clientId, [FromForm] string? caption, [FromForm] string? takenOn,
        CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        var upload = file is null ? null : new PhotoUpload(content!, file.Length);
        var added = await sender.Send(new AddPhotoMemoryCommand(contactId, clientId, upload, caption, takenOn), cancellationToken);
        return Answer(contactId, added);
    }

    /// <summary>Keeps a file as it is (known gap 107, ruled): 201, or 200 for a resend.</summary>
    [HttpPost("files")]
    [EnableRateLimiting(RateLimitPolicyNames.Photos)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(2 * Memory.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * Memory.MaxBytes)]
    public async Task<ActionResult<FileMemoryDto>> AddFile(
        Guid contactId, IFormFile? file, [FromForm] Guid clientId, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream();
        var upload = file is null ? null : new MemoryUpload(content!, file.Length, file.FileName);
        var added = await sender.Send(new AddFileMemoryCommand(contactId, clientId, upload), cancellationToken);
        return Answer(contactId, added);
    }

    /// <summary>Keeps a note (known gap 107, ruled): 201, or 200 for a resend.</summary>
    [HttpPost("notes")]
    public async Task<ActionResult<NoteMemoryDto>> AddNote(Guid contactId, AddNoteMemoryRequest note, CancellationToken cancellationToken) =>
        Answer(contactId, await sender.Send(new AddNoteMemoryCommand(contactId, note), cancellationToken));

    private ActionResult<T> Answer<T>(Guid contactId, AddedMemory<T> added) =>
        added.Created ? Created($"/api/contacts/people/{contactId}/memories", added.Memory) : Ok(added.Memory);
}
