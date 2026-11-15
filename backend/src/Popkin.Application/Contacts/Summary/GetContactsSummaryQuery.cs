using MediatR;

namespace Popkin.Application.Contacts.Summary;

/// <summary>How many contacts the caller keeps: the count line of every Contacts screen (L2-121, L2-126 AC1).</summary>
public sealed record ContactsSummaryDto(int People);

/// <summary>The caller's Contacts summary; also how the app learns Contacts is open (L2-121 AC1, AC2).</summary>
public sealed record GetContactsSummaryQuery : IRequest<ContactsSummaryDto>;

public sealed class GetContactsSummaryQueryHandler(ContactsSwitch contacts) : IRequestHandler<GetContactsSummaryQuery, ContactsSummaryDto>
{
    public Task<ContactsSummaryDto> Handle(GetContactsSummaryQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        // Nobody can add a contact yet; Add someone counts the caller's own.
        return Task.FromResult(new ContactsSummaryDto(0));
    }
}
