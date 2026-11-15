using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>
/// The caller's admin and what their role allows (L2-086). The role is read from the database on
/// every request, never from the cookie, so a changed role applies at once (L2-086 AC5).
/// </summary>
public interface IAdminGuard
{
    Task<Admin> CurrentAdminAsync(CancellationToken cancellationToken);

    /// <summary>The caller's admin, or 403 `role_not_allowed` when their role does not allow `action`.</summary>
    Task<Admin> RequireAsync(AdminAction action, CancellationToken cancellationToken);
}
