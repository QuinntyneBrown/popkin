using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Account;
using Popkin.Application.Invites;
using Popkin.Application.Photos;

namespace Popkin.Api.Controllers;

/// <summary>
/// The signed-in person's own account, authenticated by the fallback policy. It acts only on the
/// caller, so a person sees and changes only their own account.
/// </summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AccountDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAccountQuery(), cancellationToken));

    /// <summary>The active Popkins the caller hosts, which wrap up with the account (L2-049 AC3).</summary>
    [HttpGet("deletion-impact")]
    public async Task<ActionResult<DeletionImpactDto>> GetDeletionImpact(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetDeletionImpactQuery(), cancellationToken));

    public sealed record UpdateAccountRequest(string? Name);

    /// <summary>A new name (L2-048 AC2); 400 `name_invalid` unless it is 1 to 40 characters (AC3).</summary>
    [HttpPatch]
    public async Task<ActionResult<AccountDto>> Update(UpdateAccountRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new UpdateAccountNameCommand(request.Name), cancellationToken));

    /// <summary>
    /// A new photo (L2-048 AC2): 400 `photo_type_not_allowed` or `photo_too_large` when it is
    /// refused. The body may be a little larger than the largest photo, so a photo too large is
    /// told so rather than cut off.
    /// </summary>
    [HttpPut("photo")]
    [RequestSizeLimit(2 * AvatarPhotos.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * AvatarPhotos.MaxBytes)]
    public async Task<ActionResult<AccountDto>> ChangePhoto(IFormFile? photo, CancellationToken cancellationToken)
    {
        await using var content = photo?.OpenReadStream();
        var upload = photo is null ? null : new PhotoUpload(content!, photo.Length);
        return Ok(await sender.Send(new ChangeAccountPhotoCommand(upload), cancellationToken));
    }
}
