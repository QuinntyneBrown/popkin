using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>Sent by the Worker once a day: removes notification history 90 days old.</summary>
public sealed record PurgeNotificationHistoryCommand : IRequest<int>;

/// <summary>
/// Removes, in batches, the deliveries and events that happened 90 days ago or more and the emails
/// opened then, once each is settled. Ninety days is long after any retry (6 hours) or digest
/// period (7 days), and a reminder's moment has passed, so no once-only key is needed again
/// (deliver-notifications). Answers the rows removed.
/// </summary>
public sealed class PurgeNotificationHistoryCommandHandler(IAppDbContext db, TimeProvider clock)
    : IRequestHandler<PurgeNotificationHistoryCommand, int>
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(90);

    public const int BatchSize = 1000;

    public async Task<int> Handle(PurgeNotificationHistoryCommand request, CancellationToken cancellationToken)
    {
        var cutoff = clock.GetUtcNow() - Retention;
        var settled = new[]
        {
            OutgoingEmailStatus.Sent, OutgoingEmailStatus.Suppressed, OutgoingEmailStatus.Dropped, OutgoingEmailStatus.Failed,
        };
        var purged = 0;
        purged += await PurgeAsync(
            () => db.NotificationDeliveries.Where(d => db.NotificationEvents.Any(e => e.Id == d.EventId && e.OccurredAt <= cutoff)).OrderBy(d => d.Id),
            batch => db.NotificationDeliveries.RemoveRange(batch),
            cancellationToken);
        purged += await PurgeAsync(
            () => db.NotificationEvents.Where(e => e.OccurredAt <= cutoff && e.DispatchedAt != null).OrderBy(e => e.Id),
            batch => db.NotificationEvents.RemoveRange(batch),
            cancellationToken);
        purged += await PurgeAsync(
            () => db.OutgoingEmails.Where(e => e.OpenedAt <= cutoff && settled.Contains(e.Status)).OrderBy(e => e.Id),
            batch => db.OutgoingEmails.RemoveRange(batch),
            cancellationToken);
        return purged;
    }

    private async Task<int> PurgeAsync<T>(Func<IQueryable<T>> rows, Action<List<T>> remove, CancellationToken cancellationToken)
    {
        var purged = 0;
        while (true)
        {
            var batch = await rows().Take(BatchSize).ToListAsync(cancellationToken);
            if (batch.Count == 0)
            {
                return purged;
            }

            remove(batch);
            await db.SaveChangesAsync(cancellationToken);
            purged += batch.Count;
        }
    }
}
