using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Invites;
using Popkin.Application.Photos;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// Edit (L2-130): the same form changes who a contact is and their details. A photo sent with it
/// replaces theirs, and the old one is deleted once the save is kept (L2-130 AC4). Nobody is told
/// (L2-122 AC3).
/// </summary>
public sealed record EditContactCommand(Guid ContactId, SaveContactRequest Contact, PhotoUpload? Photo = null) : IRequest<ContactProfileDto>;

public sealed class EditContactCommandHandler(
    IAppDbContext db, ContactsSwitch contacts, IContactGuard guard, IPhotoProcessor processor, IPhotoStore photos)
    : IRequestHandler<EditContactCommand, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(EditContactCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var (name, details) = SaveContactValidator.Validate(request.Contact);
        var avatar = request.Photo is null ? null : await AvatarPhotos.ReadAsync(request.Photo, processor, cancellationToken);
        contact.Rename(name);
        contact.ChangeDetails(details);
        if (avatar is null)
        {
            await db.SaveChangesAsync(cancellationToken);
            return ContactProfileDto.Of(contact, photos);
        }

        var old = contact.PhotoKey;
        var key = $"contacts/{Guid.NewGuid():N}{avatar.Extension}";
        await photos.SaveAsync(key, avatar.Content, avatar.ContentType, cancellationToken);
        contact.ChangePhoto(key);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await photos.DeleteAsync(key, CancellationToken.None);
            throw;
        }

        if (old is not null)
        {
            await photos.DeleteAsync(old, CancellationToken.None);
        }

        return ContactProfileDto.Of(contact, photos);
    }
}
