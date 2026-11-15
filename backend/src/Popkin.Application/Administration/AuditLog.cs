using System.Text.Json;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>What a handler records of its change; `Details` holds old and new values and counts, never content.</summary>
public sealed record AuditRecord(
    AuditAction Action,
    AuditTargetKind TargetKind,
    string TargetId,
    string TargetName,
    string? Reason = null,
    IReadOnlyDictionary<string, object?>? Details = null);

/// <summary>
/// Adds an entry to the audit log in the handler's own transaction: the handler's one save writes
/// the change and its entry together, so a failed change leaves no entry (L2-120 AC5). It never saves.
/// </summary>
public interface IAuditLog
{
    /// <summary>Records an action of the signed-in admin, whom the handler's guard has loaded.</summary>
    Task RecordAsync(AuditRecord record, CancellationToken cancellationToken);

    /// <summary>Records an action Popkin takes itself, such as adding the first Owner.</summary>
    void RecordByPopkin(AuditRecord record);
}

public sealed class AuditLog(IAppDbContext db, IAdminGuard guard, TimeProvider clock) : IAuditLog
{
    public const string PopkinName = "Popkin";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public async Task RecordAsync(AuditRecord record, CancellationToken cancellationToken)
    {
        var admin = await guard.CurrentAdminAsync(cancellationToken);
        Add(admin.Id, admin.Name, record);
    }

    public void RecordByPopkin(AuditRecord record) => Add(null, PopkinName, record);

    private void Add(Guid? adminId, string adminName, AuditRecord record) =>
        db.AuditEntries.Add(AuditEntry.Write(
            clock.GetUtcNow(),
            adminId,
            adminName,
            record.Action,
            record.TargetKind,
            record.TargetId,
            record.TargetName,
            record.Reason,
            JsonSerializer.Serialize(record.Details ?? new Dictionary<string, object?>(), Json)));
}
