using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Telemetry;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>Deletes every audit entry two years old, in batches; the log keeps the rest (L2-120 AC6).</summary>
public sealed record PurgeOldAuditEntriesCommand : IRequest<int>;

public sealed class PurgeOldAuditEntriesCommandHandler(IAppDbContext db, TimeProvider clock, PopkinMetrics metrics)
    : IRequestHandler<PurgeOldAuditEntriesCommand, int>
{
    public const int BatchSize = 1000;

    public async Task<int> Handle(PurgeOldAuditEntriesCommand request, CancellationToken cancellationToken)
    {
        var cutoff = clock.GetUtcNow() - AuditEntry.Retention;
        var purged = 0;
        while (true)
        {
            var batch = await db.AuditEntries.Where(e => e.At <= cutoff).OrderBy(e => e.Id).Take(BatchSize).ToListAsync(cancellationToken);
            if (batch.Count == 0)
            {
                break;
            }

            db.AuditEntries.RemoveRange(batch);
            await db.SaveChangesAsync(cancellationToken);
            purged += batch.Count;
        }

        metrics.AuditEntriesPurged(purged);
        return purged;
    }
}
