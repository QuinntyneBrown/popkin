using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Auth;
using Popkin.Domain;

namespace Popkin.Application.Account;

/// <summary>
/// The caller's own account: who they are, their photo, and the phone number or email they sign
/// in with, which no other member ever sees (L2-048 AC1, L2-054 AC2).
/// </summary>
public sealed record AccountDto(Guid PersonId, string Name, string? PhotoUrl, ContactChannel Channel, string Destination);

public sealed record GetAccountQuery : IRequest<AccountDto>;

public sealed class GetAccountQueryHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos)
    : IRequestHandler<GetAccountQuery, AccountDto>
{
    public async Task<AccountDto> Handle(GetAccountQuery request, CancellationToken cancellationToken)
    {
        var person = await db.People.AsNoTracking().SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        return AccountDtos.Of(person, photos);
    }
}

public static class AccountDtos
{
    public static AccountDto Of(Person person, IPhotoStore photos)
    {
        var channel = person.Phone is null ? ContactChannel.Email : ContactChannel.Phone;
        var destination = person.Phone ?? person.Email ?? "";
        return new AccountDto(person.Id, person.Name, PhotoUrl(person, photos), channel, ContactRules.Format(channel, destination));
    }

    public static string? PhotoUrl(Person person, IPhotoStore photos) =>
        person.PhotoKey is null ? null : photos.GetReadUrl(person.PhotoKey);
}
