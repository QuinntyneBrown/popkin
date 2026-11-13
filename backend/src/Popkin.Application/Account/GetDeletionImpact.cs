using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Account;

public sealed record HostedPopkinDto(Guid PopkinId, string Name, string Emoji);

/// <summary>The active Popkins the person hosts, which wrap up when the account is deleted (L2-049 AC3).</summary>
public sealed record DeletionImpactDto(IReadOnlyList<HostedPopkinDto> HostedActivePopkins);

public sealed record GetDeletionImpactQuery : IRequest<DeletionImpactDto>;

public sealed class GetDeletionImpactQueryHandler(IAppDbContext db, ICurrentPerson current)
    : IRequestHandler<GetDeletionImpactQuery, DeletionImpactDto>
{
    public async Task<DeletionImpactDto> Handle(GetDeletionImpactQuery request, CancellationToken cancellationToken)
    {
        var hosted = await db.Popkins.AsNoTracking()
            .Where(p => p.HostPersonId == current.PersonId && p.Status == PopkinStatus.Active)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new HostedPopkinDto(p.Id, p.Name, p.Emoji))
            .ToListAsync(cancellationToken);
        return new DeletionImpactDto(hosted);
    }
}
