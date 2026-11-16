using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;

namespace Popkin.Application.Contacts.People;

/// <summary>
/// One contact of the caller's, as the profile and the edit form show them (L2-128, L2-130). The
/// profile's own design adds the rest of what it shows.
/// </summary>
public sealed record GetContactQuery(Guid ContactId) : IRequest<ContactProfileDto>;

public sealed class GetContactQueryHandler(ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos)
    : IRequestHandler<GetContactQuery, ContactProfileDto>
{
    public async Task<ContactProfileDto> Handle(GetContactQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        return ContactProfileDto.Of(await guard.RequireOwnedAsync(request.ContactId, cancellationToken), photos);
    }
}
