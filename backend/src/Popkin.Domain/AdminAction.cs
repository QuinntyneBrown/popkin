namespace Popkin.Domain;

/// <summary>Each change an admin may make, as the rows of L2-086 name them. Viewing needs none.</summary>
public enum AdminAction
{
    SuspendPerson,
    SignPersonOut,
    ExportPersonData,
    LogDataRequest,
    StartDeletion,
    CancelDeletion,
    WrapUpPopkin,
    ExtendPopkin,
    RemoveMember,
    ResetInvite,
    ReviewReports,
    RemoveContent,
    OpenModerationView,
    EndCall,
    RunJob,
    RetryExport,
    ChangeFeature,
    ChangeLimits,
    PublishAnnouncement,
    ManageNotifications,
    HoldNotifications,
    ManageAdmins,
    ExportAuditLog,
    ChangeHolidayCalendars,
}
