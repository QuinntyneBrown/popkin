using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// Add someone (L2-129): a new contact for the caller alone. A resend under the same client id
/// answers the contact the first made (L2-123 AC4). Nobody is told (L2-122 AC3).
/// </summary>
public sealed record AddContactCommand(SaveContactRequest Contact) : IRequest<ContactProfileDto>;

public sealed class AddContactCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddContactCommand, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(AddContactCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        if (await ClientWrites.FindAsync(db.Contacts, owner, request.Contact.ClientId, cancellationToken) is { } saved)
        {
            return ContactProfileDto.Of(saved, photos);
        }

        var (name, details) = SaveContactValidator.Validate(request.Contact);
        var contact = Contact.Create(owner, request.Contact.ClientId, name, details, clock.GetUtcNow());
        db.Contacts.Add(contact);
        await db.SaveChangesAsync(cancellationToken);
        return ContactProfileDto.Of(contact, photos);
    }
}
