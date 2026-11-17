namespace Popkin.Domain;

/// <summary>A row of the table of L2-086, with the actions it covers and the roles that may take them.</summary>
public sealed record AdminPermissionRow(string Row, IReadOnlyList<AdminAction> Actions, bool Owner, bool Support, bool Viewer)
{
    public bool Allows(AdminRole role) => role switch
    {
        AdminRole.Owner => Owner,
        AdminRole.Support => Support,
        _ => Viewer,
    };
}

/// <summary>The table of L2-086, the one answer to what each role may do. The API decides with it.</summary>
public static class AdminPermissions
{
    public static IReadOnlyList<AdminPermissionRow> Rows { get; } =
    [
        new("View", [], true, true, true),
        new("HelpPeople", [AdminAction.SuspendPerson, AdminAction.SignPersonOut, AdminAction.ExportPersonData, AdminAction.LogDataRequest], true, true, false),
        new("Deletion", [AdminAction.StartDeletion, AdminAction.CancelDeletion], true, false, false),
        new("HelpPopkins", [AdminAction.WrapUpPopkin, AdminAction.ExtendPopkin, AdminAction.RemoveMember, AdminAction.ResetInvite], true, true, false),
        new("Moderation", [AdminAction.ReviewReports, AdminAction.RemoveContent, AdminAction.OpenModerationView], true, true, false),
        new("Calls", [AdminAction.EndCall], true, true, false),
        new("Operations", [AdminAction.RunJob, AdminAction.RetryExport], true, true, false),
        new("Platform", [AdminAction.ChangeFeature, AdminAction.ChangeLimits, AdminAction.PublishAnnouncement], true, false, false),
        new("Notifications", [AdminAction.ManageNotifications], true, false, false),
        new("NotificationHolds", [AdminAction.HoldNotifications], true, true, false),
        new("Admins", [AdminAction.ManageAdmins], true, false, false),
        new("AuditExport", [AdminAction.ExportAuditLog], true, true, true),
    ];

    public static bool Allows(AdminRole role, AdminAction action) =>
        Rows.Single(r => r.Actions.Contains(action)).Allows(role);

    public static IReadOnlyList<AdminAction> AllowedFor(AdminRole role) =>
        Enum.GetValues<AdminAction>().Where(a => Allows(role, a)).ToList();
}
