using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Contacts.Summary;

/// <summary>How many contacts the caller keeps: the count line of every Contacts screen (L2-121, L2-126 AC1).</summary>
public sealed record ContactsSummaryDto(int People);

/// <summary>The caller's Contacts summary; also how the app learns Contacts is open (L2-121 AC1, AC2).</summary>
public sealed record GetContactsSummaryQuery : IRequest<ContactsSummaryDto>;

public sealed class GetContactsSummaryQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts)
    : IRequestHandler<GetContactsSummaryQuery, ContactsSummaryDto>
{
    public async Task<ContactsSummaryDto> Handle(GetContactsSummaryQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        return new ContactsSummaryDto(await db.Contacts.OwnedBy(current.PersonId).CountAsync(cancellationToken));
    }
}
