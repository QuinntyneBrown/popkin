using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Connections;
using Popkin.Application.Contacts.Dates;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Domain;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// Add someone (L2-129): a new contact for the caller alone. A resend under the same client id
/// answers the contact the first made (L2-123 AC4). Nobody is told (L2-122 AC3). A photo is
/// kept small and without its location or device data, as an account's is.
/// </summary>
public sealed record AddContactCommand(SaveContactRequest Contact, PhotoUpload? Photo = null) : IRequest<ContactProfileDto>;

public sealed class AddContactCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoProcessor processor, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddContactCommand, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(AddContactCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (await ClientWrites.FindAsync(db.Contacts, owner, request.Contact.ClientId, cancellationToken) is { } saved)
        {
            return await ContactProfileDto.Of(saved, photos, await KeyDateDrafts.ForProfileAsync(db, saved, today, cancellationToken)).WithAroundAsync(db, saved.OwnerId, photos, cancellationToken);
        }

        var (name, details) = SaveContactValidator.Validate(request.Contact);
        var drafts = KeyDateDrafts.Validate(request.Contact.KeyDates);
        var connect = ConnectionDrafts.Validate(request.Contact.Connect);
        var avatar = request.Photo is null ? null : await AvatarPhotos.ReadAsync(request.Photo, processor, cancellationToken);
        var contact = Contact.Create(owner, request.Contact.ClientId, name, details, clock.GetUtcNow());
        db.Contacts.Add(contact);
        await KeyDateDrafts.ApplyAsync(db, contact, drafts, clock.GetUtcNow(), cancellationToken);
        await ConnectionDrafts.ApplyAsync(db, guard, contact, connect, null, clock.GetUtcNow(), cancellationToken);
        if (avatar is null)
        {
            await db.SaveChangesAsync(cancellationToken);
            return await ContactProfileDto.Of(contact, photos, await KeyDateDrafts.ForProfileAsync(db, contact, today, cancellationToken)).WithAroundAsync(db, contact.OwnerId, photos, cancellationToken);
        }

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

        return await ContactProfileDto.Of(contact, photos, await KeyDateDrafts.ForProfileAsync(db, contact, today, cancellationToken)).WithAroundAsync(db, contact.OwnerId, photos, cancellationToken);
    }
}
