using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>The English label of each audited action, for the log, its search and its CSV (L2-120 AC1, AC2).</summary>
public static class AuditActionLabels
{
    private static readonly IReadOnlyDictionary<AuditAction, string> Labels = new Dictionary<AuditAction, string>
    {
        [AuditAction.SuspendedPerson] = "Suspended person",
        [AuditAction.LiftedSuspension] = "Lifted suspension",
        [AuditAction.SignedPersonOut] = "Signed person out",
        [AuditAction.StartedDeletion] = "Started deletion",
        [AuditAction.CancelledDeletion] = "Cancelled deletion",
        [AuditAction.ExportedPersonData] = "Exported data",
        [AuditAction.DownloadedPersonData] = "Downloaded data",
        [AuditAction.LoggedDataRequest] = "Logged data request",
        [AuditAction.WrappedUpPopkin] = "Wrapped up Popkin",
        [AuditAction.ExtendedPopkin] = "Gave more time",
        [AuditAction.RemovedMember] = "Removed member",
        [AuditAction.ResetInvite] = "Reset invite",
        [AuditAction.OpenedReport] = "Opened report",
        [AuditAction.RemovedContent] = "Removed content",
        [AuditAction.DismissedReport] = "Dismissed report",
        [AuditAction.OpenedModerationView] = "Opened moderation view",
        [AuditAction.ClosedModerationView] = "Closed moderation view",
        [AuditAction.EndedCall] = "Ended call",
        [AuditAction.RanJob] = "Ran job",
        [AuditAction.RetriedExport] = "Retried export",
        [AuditAction.TurnedFeatureOff] = "Turned feature off",
        [AuditAction.TurnedFeatureOnForEveryone] = "Turned feature on",
        [AuditAction.LimitedFeatureToChosen] = "Rolled out feature",
        [AuditAction.AddedFeaturePopkin] = "Added Popkin to feature",
        [AuditAction.RemovedFeaturePopkin] = "Removed Popkin from feature",
        [AuditAction.ChangedLimits] = "Changed limits",
        [AuditAction.PublishedAnnouncement] = "Published banner",
        [AuditAction.EndedAnnouncement] = "Took banner down",
        [AuditAction.AddedAdmin] = "Added admin",
        [AuditAction.ChangedAdminRole] = "Changed role",
        [AuditAction.RemovedAdmin] = "Removed admin",
        [AuditAction.ExportedAuditLog] = "Exported audit log",
        [AuditAction.PausedMemberEmail] = "Paused member email",
        [AuditAction.ResumedMemberEmail] = "Resumed member email",
        [AuditAction.TurnedNotificationKindOff] = "Turned notification off",
        [AuditAction.TurnedNotificationKindOn] = "Turned notification on",
    };

    public static string Of(AuditAction action) => Labels[action];

    /// <summary>The actions whose label contains `search`, without regard to case.</summary>
    public static IReadOnlyList<AuditAction> Matching(string search) =>
        Labels.Where(l => l.Value.Contains(search, StringComparison.OrdinalIgnoreCase)).Select(l => l.Key).ToList();
}
