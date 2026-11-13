using Popkin.Application.Abstractions;
using Popkin.Application.Realtime;

namespace Popkin.Api.Hubs;

/// <summary>
/// Tells a Popkin's members whenever its "here now" count changes, whether a connection caused
/// it or the end of a grace period did. The send is not awaited by whoever changed the count:
/// `PresenceChanged` carries a version, so a late one is dropped by the client, and the
/// notifier logs and counts a send that fails.
/// </summary>
public sealed class PresenceBroadcaster(PresenceTracker presence, IPopkinNotifier notifier) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        presence.Changed += Broadcast;
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        presence.Changed -= Broadcast;
        return Task.CompletedTask;
    }

    private void Broadcast(PresenceSnapshot change) =>
        _ = notifier.PresenceChanged(change.PopkinId, change.Version, change.HereNow);
}
