using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Notifications;

/// <summary>Whether member email is going out, and its traffic (L2-169 AC1, AC2).</summary>
public sealed record AdminSendStatusDto(
    bool Paused,
    DateTimeOffset? PausedAt,
    string? PausedByName,
    string? PauseReason,
    int Queued,
    int? ResumeMinutes,
    int SentToday,
    double? BouncedPercent,
    int? MedianSecondsToInbox);

/// <summary>One kind on the Kinds tab (L2-169 AC4, L2-171 AC2).</summary>
public sealed record AdminNotificationKindDto(
    NotificationKind Kind,
    string Name,
    string About,
    bool Required,
    bool OffForEveryone,
    DateTimeOffset? OffSince,
    string? OffByName,
    string? OffReason,
    int Sent24h,
    double? OpenedPercent);

public sealed record AdminNotificationGroupDto(NotificationGroup Group, string Name, IReadOnlyList<AdminNotificationKindDto> Kinds);

public sealed record AdminNotificationsDto(AdminSendStatusDto Status, IReadOnlyList<AdminNotificationGroupDto> Groups, int HoldCount);

/// <summary>Any admin reads the Notifications page; it names no person (L2-169 AC6).</summary>
public sealed record GetAdminNotificationsQuery : IRequest<AdminNotificationsDto>;

public sealed class GetAdminNotificationsQueryHandler(IAppDbContext db, IAdminGuard guard, INotificationStats stats, TimeProvider clock)
    : IRequestHandler<GetAdminNotificationsQuery, AdminNotificationsDto>
{
    public async Task<AdminNotificationsDto> Handle(GetAdminNotificationsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var traffic = await stats.ReadAsync(clock.GetUtcNow(), cancellationToken);
        var platform = await AdminNotificationPlatform.ReadAsync(db, cancellationToken);
        var groups = NotificationCatalogue.Groups
            .Select(g => new AdminNotificationGroupDto(
                g.Group,
                g.Name,
                NotificationCatalogue.All.Where(k => k.Group == g.Group)
                    .Select(k => AdminNotificationPlatform.KindOf(k, traffic))
                    .ToList()))
            .ToList();
        return new AdminNotificationsDto(AdminNotificationPlatform.StatusOf(platform, traffic), groups, 0);
    }
}

/// <summary>An Owner stops every member email in an incident, with a reason (L2-170 AC1, AC2).</summary>
public sealed record PauseMemberEmailCommand(string? Reason) : IRequest<AdminSendStatusDto>;

public sealed class PauseMemberEmailCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, INotificationStats stats, TimeProvider clock)
    : IRequestHandler<PauseMemberEmailCommand, AdminSendStatusDto>
{
    public async Task<AdminSendStatusDto> Handle(PauseMemberEmailCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ManageNotifications, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var platform = await AdminNotificationPlatform.LoadAsync(db, cancellationToken);
        var now = clock.GetUtcNow();
        if (!platform.PauseEmail(me.Id, me.Name, reason, now))
        {
            throw new ProblemException(409, "email_already_paused", "Member email is already paused.");
        }

        var traffic = await stats.ReadAsync(now, cancellationToken);
        await audit.RecordAsync(AdminNotificationPlatform.EmailRecord(AuditAction.PausedMemberEmail, reason, traffic.Queued), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return AdminNotificationPlatform.StatusOf(platform, traffic);
    }
}

/// <summary>An Owner starts member email again; the dispatcher sends the queue at its next tick (L2-170 AC3).</summary>
public sealed record ResumeMemberEmailCommand(string? Reason) : IRequest<AdminSendStatusDto>;

public sealed class ResumeMemberEmailCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, INotificationStats stats, TimeProvider clock)
    : IRequestHandler<ResumeMemberEmailCommand, AdminSendStatusDto>
{
    public async Task<AdminSendStatusDto> Handle(ResumeMemberEmailCommand request, CancellationToken cancellationToken)
    {
        await guard.RequireAsync(AdminAction.ManageNotifications, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var platform = await AdminNotificationPlatform.LoadAsync(db, cancellationToken);
        if (!platform.ResumeEmail())
        {
            throw new ProblemException(409, "email_not_paused", "Member email isn't paused.");
        }

        var traffic = await stats.ReadAsync(clock.GetUtcNow(), cancellationToken);
        await audit.RecordAsync(AdminNotificationPlatform.EmailRecord(AuditAction.ResumedMemberEmail, reason, traffic.Queued), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return AdminNotificationPlatform.StatusOf(platform, traffic);
    }
}

internal static class AdminNotificationPlatform
{
    /// <summary>
    /// About how many queued emails go out a minute once resumed: an estimate for the resume
    /// dialog's "about {m} minutes", not a limit the dispatcher keeps.
    /// </summary>
    public const int ResumeSendsPerMinute = 100;

    /// <summary>The one row, as it stands; its first values while no Owner has changed it.</summary>
    public static async Task<NotificationPlatform> ReadAsync(IAppDbContext db, CancellationToken cancellationToken) =>
        await db.NotificationPlatforms.AsNoTracking().FirstOrDefaultAsync(cancellationToken) ?? NotificationPlatform.Defaults();

    /// <summary>The one row to change, added with its first values when missing.</summary>
    public static async Task<NotificationPlatform> LoadAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        var platform = await db.NotificationPlatforms.FirstOrDefaultAsync(cancellationToken);
        if (platform is null)
        {
            platform = NotificationPlatform.Defaults();
            db.NotificationPlatforms.Add(platform);
        }

        return platform;
    }

    public static AdminSendStatusDto StatusOf(NotificationPlatform platform, NotificationTraffic traffic) => new(
        platform.IsPaused,
        platform.EmailPausedAt,
        platform.PausedByName,
        platform.PauseReason,
        traffic.Queued,
        platform.IsPaused ? Math.Max(1, (int)Math.Ceiling(traffic.Queued / (double)ResumeSendsPerMinute)) : null,
        traffic.SentToday,
        // Bounces and opens are counted once gap 129 is settled.
        null,
        traffic.MedianSecondsToInbox);

    public static AdminNotificationKindDto KindOf(NotificationCatalogueEntry entry, NotificationTraffic traffic) => new(
        entry.Kind,
        entry.Name,
        entry.About,
        entry.Required,
        false,
        null,
        null,
        null,
        traffic.Sent24h.GetValueOrDefault(entry.Kind),
        null);

    /// <summary>A pause or a resume: counts only in the details (L2-120 AC5).</summary>
    public static AuditRecord EmailRecord(AuditAction action, string reason, int queued) => new(
        action,
        AuditTargetKind.MemberEmail,
        "member-email",
        "Member email",
        reason,
        new Dictionary<string, object?> { ["queued"] = queued });
}
