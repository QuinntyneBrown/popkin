using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Administration.Auth;

/// <summary>
/// Whether an admin session is live: not revoked, not expired, its admin not removed
/// (L2-078 AC7). It keeps the admin's last activity, at most once a minute.
/// </summary>
public sealed record ValidateAdminSessionCommand(Guid SessionId, Guid AdminId) : IRequest<bool>;

public sealed class ValidateAdminSessionCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<ValidateAdminSessionCommand, bool>
{
    public async Task<bool> Handle(ValidateAdminSessionCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var session = await db.AdminSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);
        if (session is null || session.AdminId != request.AdminId || !session.IsLive(now))
        {
            return false;
        }

        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Id == request.AdminId && a.RemovedAt == null, cancellationToken);
        if (admin is null)
        {
            return false;
        }

        if (admin.Seen(now))
        {
            await db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}

/// <summary>The signed-in admin (GET /api/admin/me).</summary>
public sealed record GetAdminMeQuery : IRequest<AdminMeDto>;

public sealed class GetAdminMeQueryHandler(IAdminGuard guard) : IRequestHandler<GetAdminMeQuery, AdminMeDto>
{
    public async Task<AdminMeDto> Handle(GetAdminMeQuery request, CancellationToken cancellationToken) =>
        AdminMeDto.From(await guard.CurrentAdminAsync(cancellationToken));
}

/// <summary>Ends the caller's admin session; a Popkin app session is not touched (L2-088 AC8).</summary>
public sealed record AdminSignOutCommand : IRequest;

public sealed class AdminSignOutCommandHandler(IAppDbContext db, ICurrentAdmin current, TimeProvider clock) : IRequestHandler<AdminSignOutCommand>
{
    public async Task Handle(AdminSignOutCommand request, CancellationToken cancellationToken)
    {
        var session = await db.AdminSessions.SingleAsync(s => s.Id == current.SessionId, cancellationToken);
        session.Revoke(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
    }
}
