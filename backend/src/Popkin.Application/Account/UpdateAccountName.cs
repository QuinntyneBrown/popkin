using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Account;

/// <summary>
/// A new name of 1 to 40 characters, trimmed (L2-048 AC2, AC3). It shows wherever the person
/// appears: the account, and every Popkin they have not left.
/// </summary>
public sealed record UpdateAccountNameCommand(string? Name) : IRequest<AccountDto>;

public sealed class UpdateAccountNameCommandHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos)
    : IRequestHandler<UpdateAccountNameCommand, AccountDto>
{
    public async Task<AccountDto> Handle(UpdateAccountNameCommand request, CancellationToken cancellationToken)
    {
        var name = (request.Name ?? "").Trim();
        if (name.Length == 0 || name.Length > Person.MaxNameLength)
        {
            throw ProblemException.Invalid("name_invalid", "Enter a name so people know who you are.", "name");
        }

        var person = await db.People.SingleAsync(p => p.Id == current.PersonId, cancellationToken);
        person.Rename(name);
        var memberships = await db.Memberships.Where(m => m.PersonId == person.Id && m.LeftAt == null).ToListAsync(cancellationToken);
        memberships.ForEach(m => m.Rename(name));
        await db.SaveChangesAsync(cancellationToken);
        return AccountDtos.Of(person, photos);
    }
}
