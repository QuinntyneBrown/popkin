using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Popkin.Application.Abstractions;
using Popkin.Application.Auth;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration;

public sealed record AdminRowDto(Guid Id, string Name, string Email, AdminRole Role, bool Invited, DateTimeOffset? LastActiveAt, bool IsYou, bool IsLastOwner);

/// <summary>Who can sign in to the console: "{n} people can sign in to this console" (L2-119 AC1).</summary>
public sealed record AdminListDto(int Count, IReadOnlyList<AdminRowDto> Admins);

public sealed record GetAdminsQuery : IRequest<AdminListDto>;

public sealed class GetAdminsQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAdminsQuery, AdminListDto>
{
    public async Task<AdminListDto> Handle(GetAdminsQuery request, CancellationToken cancellationToken)
    {
        var me = await guard.CurrentAdminAsync(cancellationToken);
        var admins = await db.Admins.AsNoTracking().Where(a => a.RemovedAt == null).ToListAsync(cancellationToken);
        var owners = admins.Count(a => a.Role == AdminRole.Owner);
        var rows = admins
            .OrderByDescending(a => a.Id == me.Id)
            .ThenBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
            .Select(a => AdminRows.Of(a, me.Id, owners))
            .ToList();
        return new AdminListDto(rows.Count, rows);
    }
}

/// <summary>An Owner adds an admin and sends their invite; it takes no reason (L2-119 AC2–AC4, L2-087).</summary>
public sealed record AddAdminCommand(string? Email, AdminRole Role) : IRequest<AdminRowDto>;

public sealed class AddAdminCommandHandler(
    IAppDbContext db,
    IAdminGuard guard,
    IAuditLog audit,
    IAdminInviteSender invites,
    IConfiguration configuration,
    TimeProvider clock) : IRequestHandler<AddAdminCommand, AdminRowDto>
{
    public async Task<AdminRowDto> Handle(AddAdminCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ManageAdmins, cancellationToken);
        var email = ContactRules.Normalise(ContactChannel.Email, request.Email);
        if (!Admin.IsStaffEmail(email))
        {
            throw ProblemException.Invalid("email_not_staff", "Only @popkin.app addresses can be admins.", "email");
        }

        var existing = await db.Admins.FirstOrDefaultAsync(a => a.Email == email, cancellationToken);
        if (existing is { IsRemoved: false })
        {
            throw ProblemException.Invalid("admin_exists", "That email is already an admin's.", "email");
        }

        var now = clock.GetUtcNow();
        var admin = existing ?? Admin.Invite(email, request.Role, me.Id, now);
        if (existing is null)
        {
            db.Admins.Add(admin);
        }
        else
        {
            admin.Reinvite(request.Role, me.Id, now);
        }

        await audit.RecordAsync(
            new AuditRecord(AuditAction.AddedAdmin, AuditTargetKind.Admin, admin.Id.ToString(), admin.Name, Details: new Dictionary<string, object?> { ["role"] = request.Role.ToString() }),
            cancellationToken);
        try
        {
            var console = configuration["Admin:Origin"] ?? "https://admin.popkin.community";
            await invites.SendAsync(email, new AdminInviteMessage(me.Name, request.Role, console), cancellationToken);
        }
        catch (AdminInviteNotSentException)
        {
            throw new ProblemException(503, "invite_not_sent", "The invite couldn't be sent. Nothing has changed.");
        }

        await db.SaveChangesAsync(cancellationToken);
        var owners = await db.Admins.CountAsync(a => a.RemovedAt == null && a.Role == AdminRole.Owner, cancellationToken);
        return AdminRows.Of(admin, me.Id, owners);
    }
}

/// <summary>An Owner changes another admin's role, with an optional reason (L2-119 AC5, AC7, AC8).</summary>
public sealed record ChangeAdminRoleCommand(Guid AdminId, AdminRole Role, string? Reason) : IRequest<AdminRowDto>;

public sealed class ChangeAdminRoleCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, AdminRosterGate gate)
    : IRequestHandler<ChangeAdminRoleCommand, AdminRowDto>
{
    public async Task<AdminRowDto> Handle(ChangeAdminRoleCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ManageAdmins, cancellationToken);
        var reason = ReasonRules.Optional(request.Reason);
        using var held = await gate.EnterAsync(cancellationToken);
        var target = await AdminRows.TargetAsync(db, request.AdminId, cancellationToken);
        if (target.Id == me.Id)
        {
            throw ProblemException.Invalid("cannot_change_own_role", "You can't change your own role.", "role");
        }

        var owners = await db.Admins.CountAsync(a => a.RemovedAt == null && a.Role == AdminRole.Owner, cancellationToken);
        if (target.Role == request.Role)
        {
            return AdminRows.Of(target, me.Id, owners);
        }

        if (target.Role == AdminRole.Owner && owners <= 1)
        {
            throw AdminRows.LastOwner();
        }

        var from = target.Role;
        target.ChangeRole(request.Role);
        await audit.RecordAsync(
            new AuditRecord(AuditAction.ChangedAdminRole, AuditTargetKind.Admin, target.Id.ToString(), target.Name, reason,
                new Dictionary<string, object?> { ["from"] = from.ToString(), ["to"] = request.Role.ToString() }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return AdminRows.Of(target, me.Id, owners - (from == AdminRole.Owner ? 1 : 0) + (request.Role == AdminRole.Owner ? 1 : 0));
    }
}

/// <summary>
/// An Owner removes another admin, with an optional reason: their admin sessions end now and their
/// past actions stay in the audit log (L2-119 AC6–AC8, L2-078 AC7).
/// </summary>
public sealed record RemoveAdminCommand(Guid AdminId, string? Reason) : IRequest;

public sealed class RemoveAdminCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, AdminRosterGate gate, TimeProvider clock)
    : IRequestHandler<RemoveAdminCommand>
{
    public async Task Handle(RemoveAdminCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ManageAdmins, cancellationToken);
        var reason = ReasonRules.Optional(request.Reason);
        using var held = await gate.EnterAsync(cancellationToken);
        var target = await AdminRows.TargetAsync(db, request.AdminId, cancellationToken);
        if (target.Id == me.Id)
        {
            throw ProblemException.Invalid("cannot_remove_self", "You can't remove yourself.", "adminId");
        }

        if (target.Role == AdminRole.Owner
            && await db.Admins.CountAsync(a => a.RemovedAt == null && a.Role == AdminRole.Owner, cancellationToken) <= 1)
        {
            throw AdminRows.LastOwner();
        }

        var now = clock.GetUtcNow();
        target.Remove(now);
        foreach (var session in await db.AdminSessions.Where(s => s.AdminId == target.Id && s.RevokedAt == null).ToListAsync(cancellationToken))
        {
            session.Revoke(now);
        }

        await audit.RecordAsync(
            new AuditRecord(AuditAction.RemovedAdmin, AuditTargetKind.Admin, target.Id.ToString(), target.Name, reason,
                new Dictionary<string, object?> { ["role"] = target.Role.ToString() }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }
}

/// <summary>
/// One role change or removal at a time, so two Owners acting on each other at once cannot both
/// pass the last-Owner check. It holds for the one API instance of ADR 0009.
/// </summary>
public sealed class AdminRosterGate
{
    private readonly SemaphoreSlim _gate = new(1, 1);

    public async Task<IDisposable> EnterAsync(CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        return new Release(_gate);
    }

    private sealed class Release(SemaphoreSlim gate) : IDisposable
    {
        public void Dispose() => gate.Release();
    }
}

internal static class AdminRows
{
    public static AdminRowDto Of(Admin admin, Guid me, int owners) =>
        new(admin.Id, admin.Name, admin.Email, admin.Role, admin.IsInvited, admin.LastActiveAt, admin.Id == me, admin.Role == AdminRole.Owner && owners <= 1);

    public static async Task<Admin> TargetAsync(IAppDbContext db, Guid adminId, CancellationToken cancellationToken) =>
        await db.Admins.FirstOrDefaultAsync(a => a.Id == adminId && a.RemovedAt == null, cancellationToken)
            ?? throw new ProblemException(404, "admin_not_found", "That admin isn't here.");

    public static ProblemException LastOwner() =>
        new(409, "last_owner", "The console needs at least one Owner.");
}
