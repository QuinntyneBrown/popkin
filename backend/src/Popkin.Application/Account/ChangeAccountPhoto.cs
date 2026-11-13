using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Application.Problems;

namespace Popkin.Application.Account;

/// <summary>
/// A new photo for the account (L2-048 AC2). It shows wherever the person appears: the account,
/// and every Popkin they have not left. The photos it replaces are deleted once it is saved.
/// </summary>
public sealed record ChangeAccountPhotoCommand(PhotoUpload? Photo) : IRequest<AccountDto>;

public sealed class ChangeAccountPhotoCommandHandler(
    IAppDbContext db, ICurrentPerson current, IPhotoProcessor processor, IPhotoStore photos)
    : IRequestHandler<ChangeAccountPhotoCommand, AccountDto>
{
    public async Task<AccountDto> Handle(ChangeAccountPhotoCommand request, CancellationToken cancellationToken)
    {
        var avatar = request.Photo is null
            ? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "photo")
            : await AvatarPhotos.ReadAsync(request.Photo, processor, cancellationToken);
        var person = await db.People.SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        var memberships = await db.Memberships.Where(m => m.PersonId == person.Id && m.LeftAt == null).ToListAsync(cancellationToken);
        var replaced = memberships.Select(m => m.PhotoKey).Append(person.PhotoKey).OfType<string>().ToHashSet();

        var key = AvatarPhotos.NewKey(avatar);
        await photos.SaveAsync(key, avatar.Content, avatar.ContentType, cancellationToken);
        person.ChangePhoto(key);
        memberships.ForEach(m => m.SetPhoto(key));
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await photos.DeleteAsync(key, CancellationToken.None);
            throw;
        }

        // A Popkin the person left keeps the photo they had there.
        var kept = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == person.Id && m.PhotoKey != null && replaced.Contains(m.PhotoKey))
            .Select(m => m.PhotoKey!)
            .ToListAsync(cancellationToken);
        foreach (var old in replaced.Except(kept))
        {
            await photos.DeleteAsync(old, CancellationToken.None);
        }

        return AccountDtos.Of(person, photos);
    }
}
