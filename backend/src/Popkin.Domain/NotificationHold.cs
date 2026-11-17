namespace Popkin.Domain;

/// <summary>
/// A hold an Owner or Support put on one Popkin: its members get no email or phone alert about it
/// until it is released, and they are not told (L2-172). Released rows stay, with the audit log, as
/// the history; at most one hold on a Popkin is active.
/// </summary>
public sealed class NotificationHold
{
    private NotificationHold()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public string Reason { get; private set; } = "";

    public Guid HeldByAdminId { get; private set; }

    public string HeldByName { get; private set; } = "";

    public DateTimeOffset HeldAt { get; private set; }

    public DateTimeOffset? ReleasedAt { get; private set; }

    public Guid? ReleasedByAdminId { get; private set; }

    public string? ReleaseReason { get; private set; }

    public bool IsActive => ReleasedAt is null;

    public static NotificationHold OnPopkin(Guid popkinId, Guid adminId, string adminName, string reason, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        HeldByAdminId = adminId,
        HeldByName = adminName,
        Reason = reason,
        HeldAt = now,
    };

    /// <summary>Ends the hold; false, changing nothing, when it already ended (L2-172 AC4).</summary>
    public bool Release(Guid adminId, string reason, DateTimeOffset now)
    {
        if (!IsActive)
        {
            return false;
        }

        ReleasedAt = now;
        ReleasedByAdminId = adminId;
        ReleaseReason = reason;
        return true;
    }
}

/// <summary>Until when a hold lasts, as the holds list says it (L2-172 AC1).</summary>
public enum NotificationHoldUntil
{
    UntilReleased,
    WhileSuspended,
    UntilDeleted,
}

/// <summary>
/// The holds no admin adds: a person whose account is being deleted gets nothing (L2-172 AC5). The
/// rule reads the person, so no row is written and cancelling the deletion ends the hold at once.
/// A suspended account joins it when suspension is built.
/// </summary>
public static class NotificationHoldRules
{
    /// <summary>"Account being deleted" until the account's data is erased; null when not held.</summary>
    public static NotificationHoldUntil? HeldAutomatically(DateTimeOffset? deletedAt, DateTimeOffset? erasedAt) =>
        deletedAt is not null && erasedAt is null ? NotificationHoldUntil.UntilDeleted : null;
}
