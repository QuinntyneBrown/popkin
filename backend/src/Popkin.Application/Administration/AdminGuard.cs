using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>Loads the caller's admin once per request and checks their role against L2-086.</summary>
public sealed class AdminGuard(IAppDbContext db, ICurrentAdmin current) : IAdminGuard
{
    private Admin? _admin;

    public async Task<Admin> CurrentAdminAsync(CancellationToken cancellationToken) =>
        _admin ??= await db.Admins.FirstOrDefaultAsync(a => a.Id == current.AdminId && a.RemovedAt == null, cancellationToken)
            ?? throw new ProblemException(401, "admin_session_required", "Sign in to the admin app.");

    public async Task<Admin> RequireAsync(AdminAction action, CancellationToken cancellationToken)
    {
        var admin = await CurrentAdminAsync(cancellationToken);
        if (!AdminPermissions.Allows(admin.Role, action))
        {
            var problem = new ProblemException(403, "role_not_allowed", "Your role doesn't allow this.");
            problem.Extensions["role"] = admin.Role.ToString();
            throw problem;
        }

        return admin;
    }
}
