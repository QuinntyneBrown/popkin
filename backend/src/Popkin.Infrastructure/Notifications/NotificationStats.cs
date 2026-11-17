using Microsoft.EntityFrameworkCore;
using Popkin.Application.Administration.Notifications;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Infrastructure.Notifications;

/// <summary>
/// Reads the dispatcher's own rows for the admin page (docs/detailed-designs/admin-platform/notifications):
/// emails sent since midnight UTC and those queued while paused, from <see cref="OutgoingEmail"/>;
/// each kind's sends on either channel in 24 hours, from <see cref="NotificationDelivery"/>.
/// </summary>
public sealed class NotificationStats(AppDbContext db) : INotificationStats
{
    public async Task<NotificationTraffic> ReadAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var midnight = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var sentToday = await db.OutgoingEmails.AsNoTracking()
            .Where(e => e.SentAt != null && e.SentAt >= midnight)
            .Select(e => new { e.Id, SentAt = e.SentAt!.Value })
            .ToListAsync(cancellationToken);
        var queued = await db.OutgoingEmails.CountAsync(e => e.Status == OutgoingEmailStatus.Queued, cancellationToken);

        // From the earliest change an email carries to the mail provider accepting it.
        var ids = sentToday.Select(e => e.Id).ToList();
        var earliest = await db.NotificationDeliveries.AsNoTracking()
            .Where(d => d.OutgoingEmailId != null && ids.Contains(d.OutgoingEmailId.Value))
            .Join(db.NotificationEvents, d => d.EventId, e => e.Id, (d, e) => new { Email = d.OutgoingEmailId!.Value, e.OccurredAt })
            .ToListAsync(cancellationToken);
        var firstChange = earliest.GroupBy(x => x.Email).ToDictionary(g => g.Key, g => g.Min(x => x.OccurredAt));
        var waits = sentToday
            .Where(e => firstChange.ContainsKey(e.Id))
            .Select(e => (e.SentAt - firstChange[e.Id]).TotalSeconds)
            .Order()
            .ToList();

        var dayAgo = now.AddHours(-24);
        var sent24h = (await db.NotificationDeliveries.AsNoTracking()
                .Where(d => d.Status == NotificationDeliveryStatus.Sent && d.SentAt >= dayAgo)
                .Join(db.NotificationEvents, d => d.EventId, e => e.Id, (d, e) => e.Kind)
                .ToListAsync(cancellationToken))
            .GroupBy(k => k)
            .ToDictionary(g => g.Key, g => g.Count());

        return new NotificationTraffic(sentToday.Count, queued, Median(waits), sent24h);
    }

    private static int? Median(IReadOnlyList<double> sorted) =>
        sorted.Count == 0
            ? null
            : (int)Math.Round(sorted.Count % 2 == 1
                ? sorted[sorted.Count / 2]
                : (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2);
}
