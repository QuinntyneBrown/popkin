using System.Text;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration;

namespace Popkin.Api.Controllers.Administration;

/// <summary>The audit log: read and exported by any admin, changed by nobody (L2-120).</summary>
[Route("api/admin/audit")]
public sealed class AdminAuditController(ISender sender, TimeProvider clock) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AuditPageDto>> GetEntries(
        [FromQuery] string? search,
        [FromQuery] Guid? adminId,
        [FromQuery] string? before,
        [FromQuery] int? limit,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAuditEntriesQuery(search, adminId, before, limit), cancellationToken));

    /// <summary>The entries that match, as a CSV download (L2-120 AC4).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string? search, [FromQuery] Guid? adminId, CancellationToken cancellationToken)
    {
        var csv = await sender.Send(new ExportAuditLogCommand(search, adminId), cancellationToken);
        var day = clock.GetUtcNow().ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", $"popkin-audit-{day}.csv");
    }
}
