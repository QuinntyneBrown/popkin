using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Administration;

public sealed record AdminRoleCountsDto(int Owner, int Support, int Viewer);

public sealed record AdminPermissionRowDto(string Row, bool Owner, bool Support, bool Viewer);

/// <summary>"What each role can do": the table of L2-086 and how many admins hold each role (L2-086 AC4).</summary>
public sealed record AdminRolesDto(AdminRoleCountsDto Counts, IReadOnlyList<AdminPermissionRowDto> Rows);

public sealed record GetAdminRolesQuery : IRequest<AdminRolesDto>;

public sealed class GetAdminRolesQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAdminRolesQuery, AdminRolesDto>
{
    public async Task<AdminRolesDto> Handle(GetAdminRolesQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var roles = await db.Admins.AsNoTracking().Where(a => a.RemovedAt == null).Select(a => a.Role).ToListAsync(cancellationToken);
        return new AdminRolesDto(
            new AdminRoleCountsDto(
                roles.Count(r => r == AdminRole.Owner),
                roles.Count(r => r == AdminRole.Support),
                roles.Count(r => r == AdminRole.Viewer)),
            AdminPermissions.Rows.Select(r => new AdminPermissionRowDto(r.Row, r.Owner, r.Support, r.Viewer)).ToList());
    }
}
