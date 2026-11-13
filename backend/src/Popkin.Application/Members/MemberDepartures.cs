using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Application.Realtime;
using Popkin.Domain;

namespace Popkin.Application.Members;

/// <summary>
/// What follows a member leaving a Popkin, once it is saved (L2-047): whether they left it
/// themselves or their account was deleted (L2-049).
/// </summary>
public sealed class MemberDepartures(
    IAppDbContext db, CallLeaver calls, PresenceTracker presence, IPopkinConnections connections, IPopkinNotifier notifier)
{
    /// <summary>
    /// Off the call, no longer here, and out of the Popkin's group before the others are told,
    /// so the one who left hears nothing more of it.
    /// </summary>
    public async Task AnnounceAsync(Guid popkinId, Membership membership, CancellationToken cancellationToken)
    {
        if (await CallReads.UnderWayAsync(db, popkinId, cancellationToken) is { } call
            && await CallReads.ParticipantIdAsync(db, popkinId, call.Id, membership.Id, cancellationToken) is { } participantId)
        {
            await calls.LeaveAsync(participantId, CancellationToken.None);
        }

        foreach (var connectionId in presence.Leave(membership.PersonId, popkinId))
        {
            await connections.RemoveFromPopkinAsync(connectionId, popkinId, CancellationToken.None);
        }

        await notifier.MemberLeft(popkinId, membership.Id);
    }
}
