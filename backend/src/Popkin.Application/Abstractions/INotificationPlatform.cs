using Popkin.Domain;

namespace Popkin.Application.Abstractions;

/// <summary>
/// What an Owner set for every member's notifications, answered from the platform snapshot: the
/// API refreshes it per request and the dispatcher at each tick, so a change reaches both within
/// a minute (docs/detailed-designs/admin-platform/notifications).
/// </summary>
public interface INotificationPlatform
{
    /// <summary>Whether an Owner switched the kind off for everyone (L2-171).</summary>
    bool IsKindOff(NotificationKind kind);
}
