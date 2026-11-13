using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;

namespace Popkin.Application.Calls;

/// <summary>The member leaves the call they are on; when nobody remains, the call ends (L2-029 AC6, L2-030 AC6).</summary>
public sealed record LeaveCallCommand(Guid PopkinId, Guid CallId) : IRequest;

public sealed class LeaveCallCommandHandler(IAppDbContext db, IMembershipGuard guard, CallLeaver leaver) : IRequestHandler<LeaveCallCommand>
{
    public async Task Handle(LeaveCallCommand request, CancellationToken cancellationToken)
    {
        // Leaving adds nothing, so a wrapped-up Popkin does not refuse it.
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var participantId = await CallReads.ParticipantIdAsync(db, popkin.Id, request.CallId, membership.Id, cancellationToken)
            ?? throw CallProblems.NotFound();
        await leaver.LeaveAsync(participantId, cancellationToken);
    }
}

public static class CallProblems
{
    /// <summary>The caller is not on that call, whether or not it exists.</summary>
    public static ProblemException NotFound() => new(404, "call_not_found", "You're not on this call.");
}

/// <summary>
/// Takes a participant off their call, whether they chose "Leave" or their connection dropped
/// and did not come back.
/// </summary>
public sealed class CallLeaver(IAppDbContext db, TimeProvider clock, IPopkinNotifier notifier, IPopkinConnections connections)
{
    /// <summary>How often a leave that lost to another change of the same call is tried again.</summary>
    private const int Attempts = 3;

    /// <summary>Returns false when the participant had left already.</summary>
    public async Task<bool> LeaveAsync(Guid participantId, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            var participant = await db.CallParticipants.FirstOrDefaultAsync(p => p.Id == participantId && p.LeftAt == null, cancellationToken);
            if (participant is null)
            {
                return false;
            }

            var call = await db.Calls.FirstAsync(c => c.Id == participant.CallId, cancellationToken);
            var remaining = await db.CallParticipants.CountAsync(
                p => p.CallId == call.Id && p.LeftAt == null && p.Id != participant.Id, cancellationToken);
            call.Leave(participant, last: remaining == 0, clock.GetUtcNow());
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (attempt < Attempts)
            {
                // Someone joined or left at the same moment: leave the call as it now stands.
                db.CallParticipants.Entry(participant).State = EntityState.Detached;
                db.Calls.Entry(call).State = EntityState.Detached;
                continue;
            }

            // After the commit: the connection they were on the call with hears no more of it,
            // those still on it learn who left, and the banner shows the lower count, or goes
            // for everyone when the call has ended (L2-029 AC6).
            if (participant.ConnectionId is { } connectionId)
            {
                await connections.RemoveFromCallAsync(connectionId, call.Id, CancellationToken.None);
            }

            await notifier.ParticipantLeft(call.Id, participant.MembershipId);
            if (call.EndedAt is null)
            {
                await notifier.CallChanged(call.PopkinId, call.Id, call.Version, remaining);
            }
            else
            {
                await notifier.CallEnded(call.PopkinId, call.Id);
            }

            return true;
        }
    }
}
