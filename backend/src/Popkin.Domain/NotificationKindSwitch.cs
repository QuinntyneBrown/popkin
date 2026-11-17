namespace Popkin.Domain;

/// <summary>
/// A kind an Owner switched off for every member (L2-171). A row means the kind is off; switching
/// it back on removes the row, and the audit log keeps the history. Members' own choices are not
/// touched, so they come back when it is on again.
/// </summary>
public sealed class NotificationKindSwitch
{
    private NotificationKindSwitch()
    {
    }

    public NotificationKind Kind { get; private set; }

    public DateTimeOffset OffSince { get; private set; }

    public Guid OffByAdminId { get; private set; }

    public string OffByName { get; private set; } = "";

    public string Reason { get; private set; } = "";

    public static NotificationKindSwitch Off(NotificationKind kind, Guid adminId, string adminName, string reason, DateTimeOffset now) => new()
    {
        Kind = kind,
        OffSince = now,
        OffByAdminId = adminId,
        OffByName = adminName,
        Reason = reason,
    };
}
