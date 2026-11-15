namespace Popkin.Domain;

/// <summary>
/// One action in the admin app: who, what, to whom or what, why and when (L2-120). It is written
/// in the transaction of the change it records and never changed; it is deleted when it is two
/// years old (L2-120 AC6). It names a person or a Popkin by name and id and holds no message
/// text, photo, code or session token (L2-120 AC7).
/// </summary>
public sealed class AuditEntry
{
    public const int MaxDetailsLength = 2000;

    public static readonly TimeSpan Retention = TimeSpan.FromDays(730);

    private AuditEntry()
    {
    }

    /// <summary>Rises with each entry written, so the log reads newest first by it.</summary>
    public long Id { get; private set; }

    public DateTimeOffset At { get; private set; }

    /// <summary>Null only for an entry Popkin writes itself, named "Popkin".</summary>
    public Guid? AdminId { get; private set; }

    /// <summary>The admin's name when the entry was written, so a removed admin's entries read as they did.</summary>
    public string AdminName { get; private set; } = "";

    public AuditAction Action { get; private set; }

    public AuditTargetKind TargetKind { get; private set; }

    public string TargetId { get; private set; } = "";

    public string TargetName { get; private set; } = "";

    public string? Reason { get; private set; }

    /// <summary>A small JSON object: old and new values, counts, a Popkin's invite codes.</summary>
    public string Details { get; private set; } = "{}";

    public static AuditEntry Write(
        DateTimeOffset at,
        Guid? adminId,
        string adminName,
        AuditAction action,
        AuditTargetKind targetKind,
        string targetId,
        string targetName,
        string? reason,
        string details) => new()
    {
        At = at,
        AdminId = adminId,
        AdminName = adminName,
        Action = action,
        TargetKind = targetKind,
        TargetId = targetId,
        TargetName = targetName,
        Reason = reason,
        Details = details.Length > MaxDetailsLength ? throw new ArgumentException("The details are too long.", nameof(details)) : details,
    };

    public bool MayBeDeleted(DateTimeOffset now) => At <= now - Retention;
}
