using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// Edit (L2-130): the same form changes who a contact is and their details. The photo stays as
/// it is (the edit form draws no way to change it). Nobody is told (L2-122 AC3).
/// </summary>
public sealed record EditContactCommand(Guid ContactId, SaveContactRequest Contact) : IRequest<ContactProfileDto>;

public sealed class EditContactCommandHandler(IAppDbContext db, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos)
    : IRequestHandler<EditContactCommand, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(EditContactCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var (name, details) = SaveContactValidator.Validate(request.Contact);
        contact.Rename(name);
        contact.ChangeDetails(details);
        await db.SaveChangesAsync(cancellationToken);
        return ContactProfileDto.Of(contact, photos);
    }
}
