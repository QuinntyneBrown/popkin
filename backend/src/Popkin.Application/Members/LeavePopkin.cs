using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Application.Problems;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Members;

/// <summary>
/// The member leaves the Popkin (L2-047). What they added stays; every later request of theirs
/// in it is answered as if it did not exist (L2-047 AC4).
/// </summary>
public sealed record LeavePopkinCommand(Guid PopkinId) : IRequest;

public sealed class LeavePopkinCommandHandler(
    IAppDbContext db,
    IMembershipGuard guard,
    TimeProvider clock,
    CallLeaver calls,
    PresenceTracker presence,
    IPopkinConnections connections,
    IPopkinNotifier notifier)
    : IRequestHandler<LeavePopkinCommand>
{
    public async Task Handle(LeavePopkinCommand request, CancellationToken cancellationToken)
    {
        // Leaving adds nothing to the Popkin, so a wrapped-up one does not refuse it.
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        // The Host wraps the Popkin up instead, even when the request is made by hand (L2-047 AC3).
        if (membership.Role == MembershipRole.Host)
        {
            throw HostCannotLeave();
        }

        membership.Leave(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);

        // After the commit: off the call, no longer here, and out of the Popkin's group before
        // the others are told, so the one who left hears nothing more of it.
        if (await CallReads.UnderWayAsync(db, popkin.Id, cancellationToken) is { } call
            && await CallReads.ParticipantIdAsync(db, popkin.Id, call.Id, membership.Id, cancellationToken) is { } participantId)
        {
            await calls.LeaveAsync(participantId, CancellationToken.None);
        }

        foreach (var connectionId in presence.Leave(membership.PersonId, popkin.Id))
        {
            await connections.RemoveFromPopkinAsync(connectionId, popkin.Id, CancellationToken.None);
        }

        await notifier.MemberLeft(popkin.Id, membership.Id);
    }

    public static ProblemException HostCannotLeave() =>
        new(403, "host_cannot_leave", "The Host can't leave. Wrap the Popkin up instead.");
}
