using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Contacts.People;

/// <summary>One row of People (L2-126 AC3): who they are, their next key date and when we last talked.</summary>
public sealed record ContactRowDto(
    Guid Id,
    string Name,
    string FirstName,
    string? KnownAs,
    ContactCircle? Circle,
    bool IsClosest,
    string? PhotoUrl,
    string Initials,
    PopkinColour Accent,
    NextDateDto? NextDate,
    DateOnly? LastTalkedOn,
    int? LastTalkedDays);

/// <summary>A contact's soonest key date on or after the day asked for. Joins with Key dates.</summary>
public sealed record NextDateDto(int Month, int Day, string Kind, string Title, int InDays);

public sealed record PeopleDto(IReadOnlyList<ContactRowDto> Contacts);

/// <summary>
/// People (L2-126): every contact of the caller's, by name A to Z ignoring case, for the device's
/// day `On`. Nobody else's is ever in it (L2-122). The next key date and last talked join with
/// Key dates and Log.
/// </summary>
public sealed record GetPeopleQuery(string? On) : IRequest<PeopleDto>;

public sealed class GetPeopleQueryHandler(IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IPhotoStore photos)
    : IRequestHandler<GetPeopleQuery, PeopleDto>
{
    public async Task<PeopleDto> Handle(GetPeopleQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        ContactsDayValidator.Parse(request.On);
        var kept = await db.Contacts.OwnedBy(current.PersonId).AsNoTracking().ToListAsync(cancellationToken);
        return new PeopleDto(kept
            .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .Select(c => new ContactRowDto(
                c.Id,
                c.Name,
                PersonName.FirstName(c.Name),
                c.KnownAs,
                c.Circle,
                c.IsClosest,
                c.PhotoKey is { } key ? photos.GetReadUrl(key) : null,
                PersonName.Initials(c.Name),
                AvatarAccent.For(c.Id),
                null,
                null,
                null))
            .ToList());
    }
}
