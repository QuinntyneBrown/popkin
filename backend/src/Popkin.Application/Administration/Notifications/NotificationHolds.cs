using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Administration.Notifications;

public sealed record AdminHoldPopkinDto(Guid Id, string Name, string Emoji, PopkinColour Colour, int Members, string InviteCode);

public sealed record AdminHoldPersonDto(Guid Id, string Name, string? Email, string? Avatar);

/// <summary>One hold; an automatic hold has no id, is by "System" and cannot be released (L2-172 AC5).</summary>
public sealed record AdminNotificationHoldDto(
    Guid? Id,
    string Target,
    bool Automatic,
    AdminHoldPopkinDto? Popkin,
    AdminHoldPersonDto? Person,
    string Why,
    string ByName,
    DateTimeOffset Since,
    NotificationHoldUntil Until);

/// <summary>Manual holds first, then automatic, each newest first; the provider's count is null until gap 129.</summary>
public sealed record AdminNotificationHoldsDto(IReadOnlyList<AdminNotificationHoldDto> Holds, int? SuppressedAddresses);

public sealed record HoldPopkinMatchDto(Guid PopkinId, string Name, string Emoji, PopkinColour Colour, string InviteCode);

/// <summary>Any admin reads the holds (L2-172 AC1).</summary>
public sealed record GetNotificationHoldsQuery : IRequest<AdminNotificationHoldsDto>;

public sealed class GetNotificationHoldsQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetNotificationHoldsQuery, AdminNotificationHoldsDto>
{
    public async Task<AdminNotificationHoldsDto> Handle(GetNotificationHoldsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var manual = await NotificationHoldList.ManualAsync(db, null, cancellationToken);
        var automatic = await db.People.AsNoTracking()
            .Where(p => p.DeletedAt != null && p.ErasedAt == null)
            .OrderByDescending(p => p.DeletedAt)
            .Select(p => new { p.Id, p.Name, p.Email, p.DeletedAt, p.ErasedAt })
            .ToListAsync(cancellationToken);
        var held = automatic
            .Select(p => (Person: p, Until: NotificationHoldRules.HeldAutomatically(p.DeletedAt, p.ErasedAt)))
            .Where(x => x.Until is not null)
            .Select(x => new AdminNotificationHoldDto(
                null,
                "Person",
                true,
                null,
                new AdminHoldPersonDto(x.Person.Id, x.Person.Name, x.Person.Email, null),
                "Account being deleted",
                "System",
                x.Person.DeletedAt!.Value,
                x.Until!.Value));
        return new AdminNotificationHoldsDto([.. manual, .. held], null);
    }
}

/// <summary>
/// The search of "Hold a Popkin": active Popkins whose name contains the text or whose invite code
/// is it, ignoring case, not already held, by name (L2-172 AC2).
/// </summary>
public sealed record SearchHoldPopkinsQuery(string? Text) : IRequest<IReadOnlyList<HoldPopkinMatchDto>>;

public sealed class SearchHoldPopkinsQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<SearchHoldPopkinsQuery, IReadOnlyList<HoldPopkinMatchDto>>
{
    public const int MaxMatches = 20;

    public async Task<IReadOnlyList<HoldPopkinMatchDto>> Handle(SearchHoldPopkinsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var text = request.Text?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(text))
        {
            return [];
        }

        return await db.Popkins.AsNoTracking()
            .Where(p => p.Status == PopkinStatus.Active && (p.Name.ToLower().Contains(text) || p.InviteCode.ToLower() == text))
            .Where(p => !db.NotificationHolds.Any(h => h.PopkinId == p.Id && h.ReleasedAt == null))
            .OrderBy(p => p.Name)
            .Take(MaxMatches)
            .Select(p => new HoldPopkinMatchDto(p.Id, p.Name, p.Emoji, p.Colour, p.InviteCode))
            .ToListAsync(cancellationToken);
    }
}

/// <summary>An Owner or Support holds every notification about one Popkin, with a reason (L2-172 AC2, AC3).</summary>
public sealed record HoldPopkinNotificationsCommand(Guid PopkinId, string? Reason) : IRequest<AdminNotificationHoldDto>;

public sealed class HoldPopkinNotificationsCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot, TimeProvider clock)
    : IRequestHandler<HoldPopkinNotificationsCommand, AdminNotificationHoldDto>
{
    public async Task<AdminNotificationHoldDto> Handle(HoldPopkinNotificationsCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.HoldNotifications, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var popkin = await db.Popkins.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.PopkinId, cancellationToken)
            ?? throw MembershipGuard.NotFound();
        if (popkin.Status != PopkinStatus.Active)
        {
            throw MembershipGuard.WrappedUp();
        }

        if (await db.NotificationHolds.AnyAsync(h => h.PopkinId == popkin.Id && h.ReleasedAt == null, cancellationToken))
        {
            throw new ProblemException(409, "popkin_already_held", $"{popkin.Name} is already held.");
        }

        var hold = NotificationHold.OnPopkin(popkin.Id, me.Id, me.Name, reason, clock.GetUtcNow());
        db.NotificationHolds.Add(hold);
        var members = await NotificationHoldList.MembersAsync(db, popkin.Id, cancellationToken);
        await audit.RecordAsync(NotificationHoldList.Record(AuditAction.HeldNotifications, popkin, reason, members), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
        return (await NotificationHoldList.ManualAsync(db, hold.Id, cancellationToken)).Single();
    }
}

/// <summary>An Owner or Support releases a hold, with a reason; nothing held back is sent (L2-172 AC4).</summary>
public sealed record ReleaseNotificationHoldCommand(Guid HoldId, string? Reason) : IRequest;

public sealed class ReleaseNotificationHoldCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, IPlatformSnapshot snapshot, TimeProvider clock)
    : IRequestHandler<ReleaseNotificationHoldCommand>
{
    public async Task Handle(ReleaseNotificationHoldCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.HoldNotifications, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var hold = await db.NotificationHolds.FirstOrDefaultAsync(h => h.Id == request.HoldId, cancellationToken);
        if (hold is null || !hold.Release(me.Id, reason, clock.GetUtcNow()))
        {
            throw new ProblemException(404, "hold_not_found", "That hold isn't there any more.");
        }

        var popkin = await db.Popkins.AsNoTracking().FirstAsync(p => p.Id == hold.PopkinId, cancellationToken);
        var members = await NotificationHoldList.MembersAsync(db, popkin.Id, cancellationToken);
        await audit.RecordAsync(NotificationHoldList.Record(AuditAction.ReleasedNotificationHold, popkin, reason, members), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        snapshot.Invalidate();
    }
}

internal static class NotificationHoldList
{
    /// <summary>The active manual holds, newest first, or the one with `only`.</summary>
    public static async Task<IReadOnlyList<AdminNotificationHoldDto>> ManualAsync(IAppDbContext db, Guid? only, CancellationToken cancellationToken) =>
        await db.NotificationHolds.AsNoTracking()
            .Where(h => h.ReleasedAt == null && (only == null || h.Id == only))
            .Join(db.Popkins, h => h.PopkinId, p => p.Id, (h, p) => new { Hold = h, Popkin = p })
            .OrderByDescending(x => x.Hold.HeldAt)
            .Select(x => new AdminNotificationHoldDto(
                x.Hold.Id,
                "Popkin",
                false,
                new AdminHoldPopkinDto(
                    x.Popkin.Id,
                    x.Popkin.Name,
                    x.Popkin.Emoji,
                    x.Popkin.Colour,
                    db.Memberships.Count(m => m.PopkinId == x.Popkin.Id && m.LeftAt == null),
                    x.Popkin.InviteCode),
                null,
                x.Hold.Reason,
                x.Hold.HeldByName,
                x.Hold.HeldAt,
                NotificationHoldUntil.UntilReleased))
            .ToListAsync(cancellationToken);

    /// <summary>The number of manual and automatic holds, for "Holds {n}".</summary>
    public static async Task<int> CountAsync(IAppDbContext db, CancellationToken cancellationToken) =>
        await db.NotificationHolds.CountAsync(h => h.ReleasedAt == null, cancellationToken)
        + await db.People.CountAsync(p => p.DeletedAt != null && p.ErasedAt == null, cancellationToken);

    public static Task<int> MembersAsync(IAppDbContext db, Guid popkinId, CancellationToken cancellationToken) =>
        db.Memberships.CountAsync(m => m.PopkinId == popkinId && m.LeftAt == null, cancellationToken);

    /// <summary>A hold or a release: the Popkin and the member count, never content (L2-120 AC5).</summary>
    public static AuditRecord Record(AuditAction action, PopkinSpace popkin, string reason, int members) => new(
        action,
        AuditTargetKind.Popkin,
        popkin.Id.ToString(),
        popkin.Name,
        reason,
        new Dictionary<string, object?> { ["members"] = members });
}
