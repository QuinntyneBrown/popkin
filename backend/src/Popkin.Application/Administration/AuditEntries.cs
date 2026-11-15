using System.Globalization;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Administration;

public sealed record AuditEntryDto(
    long Id,
    DateTimeOffset At,
    Guid? AdminId,
    string AdminName,
    AuditAction Action,
    string ActionLabel,
    AuditTargetKind TargetKind,
    string TargetId,
    string TargetName,
    string? Reason,
    string Details);

/// <summary>A page of the audit log, newest first; `next` continues after its last entry (L2-120 AC3).</summary>
public sealed record AuditPageDto(IReadOnlyList<AuditEntryDto> Entries, int Total, string? Next);

/// <summary>The audit log, searched and filtered by admin (L2-120 AC1–AC3). Any admin.</summary>
public sealed record GetAuditEntriesQuery(string? Search, Guid? AdminId, string? Before, int? Limit) : IRequest<AuditPageDto>;

public sealed class GetAuditEntriesQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAuditEntriesQuery, AuditPageDto>
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 100;

    public async Task<AuditPageDto> Handle(GetAuditEntriesQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var limit = Math.Clamp(request.Limit ?? DefaultLimit, 1, MaxLimit);
        var matching = AuditFilter.Apply(db.AuditEntries.AsNoTracking(), request.Search, request.AdminId);
        var total = await matching.CountAsync(cancellationToken);
        var page = matching;
        if (long.TryParse(request.Before, NumberStyles.None, CultureInfo.InvariantCulture, out var before))
        {
            page = page.Where(e => e.Id < before);
        }

        var entries = await page.OrderByDescending(e => e.Id).Take(limit + 1).ToListAsync(cancellationToken);
        var next = entries.Count > limit ? entries[limit - 1].Id.ToString(CultureInfo.InvariantCulture) : null;
        return new AuditPageDto(entries.Take(limit).Select(AuditFilter.ToDto).ToList(), total, next);
    }
}

/// <summary>
/// Every entry that matches, as CSV, for any admin (L2-120 AC4). The export is itself an entry,
/// written before the rows are read; the search text is not kept in it.
/// </summary>
public sealed record ExportAuditLogCommand(string? Search, Guid? AdminId) : IRequest<string>;

public sealed class ExportAuditLogCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit) : IRequestHandler<ExportAuditLogCommand, string>
{
    public async Task<string> Handle(ExportAuditLogCommand request, CancellationToken cancellationToken)
    {
        var admin = await guard.RequireAsync(AdminAction.ExportAuditLog, cancellationToken);
        var matching = AuditFilter.Apply(db.AuditEntries.AsNoTracking(), request.Search, request.AdminId);
        var rows = await matching.CountAsync(cancellationToken);
        await audit.RecordAsync(
            new AuditRecord(
                AuditAction.ExportedAuditLog,
                AuditTargetKind.Admin,
                admin.Id.ToString(),
                admin.Name,
                Details: new Dictionary<string, object?>
                {
                    ["search"] = !string.IsNullOrWhiteSpace(request.Search),
                    ["adminId"] = request.AdminId,
                    ["rows"] = rows,
                }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        var csv = new StringBuilder("Time (UTC),Admin,Admin id,Action,Target kind,Target,Target id,Reason,Details\r\n");
        foreach (var e in await matching.OrderByDescending(e => e.Id).ToListAsync(cancellationToken))
        {
            csv.AppendJoin(',', new[]
            {
                e.At.UtcDateTime.ToString("O", CultureInfo.InvariantCulture),
                e.AdminName,
                e.AdminId?.ToString() ?? "",
                AuditActionLabels.Of(e.Action),
                e.TargetKind.ToString(),
                e.TargetName,
                e.TargetId,
                e.Reason ?? "",
                e.Details,
            }.Select(Cell)).Append("\r\n");
        }

        return csv.ToString();
    }

    // A cell that a spreadsheet would run as a formula is kept as text.
    private static string Cell(string value)
    {
        if (value.Length > 0 && value[0] is '=' or '+' or '-' or '@')
        {
            value = "'" + value;
        }

        return value.IndexOfAny([',', '"', '\r', '\n']) < 0 ? value : $"\"{value.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";
    }
}

internal static class AuditFilter
{
    public const int MaxSearchLength = 100;

    public static IQueryable<AuditEntry> Apply(IQueryable<AuditEntry> entries, string? search, Guid? adminId)
    {
        if (adminId is { } admin)
        {
            entries = entries.Where(e => e.AdminId == admin);
        }

        var text = search?.Trim();
        if (!string.IsNullOrEmpty(text))
        {
            text = text.Length > MaxSearchLength ? text[..MaxSearchLength] : text;
            var lower = text.ToLowerInvariant();
            var actions = AuditActionLabels.Matching(text);
            entries = entries.Where(e =>
                e.AdminName.ToLower().Contains(lower)
                || e.TargetName.ToLower().Contains(lower)
                || (e.Reason != null && e.Reason.ToLower().Contains(lower))
                || actions.Contains(e.Action));
        }

        return entries;
    }

    public static AuditEntryDto ToDto(AuditEntry e) =>
        new(e.Id, e.At, e.AdminId, e.AdminName, e.Action, AuditActionLabels.Of(e.Action), e.TargetKind, e.TargetId, e.TargetName, e.Reason, e.Details);
}
