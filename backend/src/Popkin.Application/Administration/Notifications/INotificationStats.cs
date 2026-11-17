using Popkin.Domain;

namespace Popkin.Application.Administration.Notifications;

/// <summary>
/// The totals the admin Notifications page shows. Counts only: no person, address or text
/// (L2-169 AC6, L2-174 AC6).
/// </summary>
public sealed record NotificationTraffic(
    int SentToday,
    int Queued,
    int? MedianSecondsToInbox,
    IReadOnlyDictionary<NotificationKind, int> Sent24h);

public interface INotificationStats
{
    Task<NotificationTraffic> ReadAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
