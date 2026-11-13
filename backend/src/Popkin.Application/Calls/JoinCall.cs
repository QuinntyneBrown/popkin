using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Calls;

/// <summary>`Started` is true when this request started the call.</summary>
public sealed record JoinCallResult(JoinedCallDto Joined, bool Started);

/// <summary>
/// Puts the member on the Popkin's group call, with the microphone and camera as they arrive:
/// it starts the call when none is under way and joins the one that is (L2-029 AC1, AC2).
/// </summary>
public sealed record JoinCallCommand(Guid PopkinId, bool MicOn, bool CameraOn) : IRequest<JoinCallResult>;

public sealed class JoinCallCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore photos, IMediaRelayCredentials relay, IPopkinNotifier notifier)
    : IRequestHandler<JoinCallCommand, JoinCallResult>
{
    /// <summary>How often a join that lost to another change of the same call is tried again.</summary>
    private const int Attempts = 3;

    public async Task<JoinCallResult> Handle(JoinCallCommand request, CancellationToken cancellationToken)
    {
        // No call starts, and nobody joins one, in a Popkin that has wrapped up (L2-045 AC1).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);

        for (var attempt = 1; ; attempt++)
        {
            var call = await CallReads.UnderWayAsync(db, popkin.Id, cancellationToken);
            var started = call is null;
            if (call is null)
            {
                call = Call.Start(popkin.Id, clock.GetUtcNow());
                db.Calls.Add(call);
            }

            // A member who is on the call already stays as they are: the repeat adds nothing.
            var on = !started && await db.CallParticipants.AnyAsync(
                p => p.CallId == call.Id && p.MembershipId == membership.Id && p.LeftAt == null, cancellationToken);
            if (on)
            {
                return new JoinCallResult(await JoinedAsync(call, membership, cancellationToken), Started: false);
            }

            var participant = call.Join(membership.Id, request.MicOn, request.CameraOn, clock.GetUtcNow());
            db.CallParticipants.Add(participant);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException) when (attempt < Attempts)
            {
                // Someone else started the call, or changed who is on it, at the same moment:
                // this join is made again on the call as it now stands.
                db.CallParticipants.Entry(participant).State = EntityState.Detached;
                db.Calls.Entry(call).State = EntityState.Detached;
                continue;
            }

            // Told after the commit, in the same request: those on the call learn who came, and
            // the banner of every member with Popkin open shows the new count (L2-029 AC2).
            var joined = await JoinedAsync(call, membership, cancellationToken);
            await notifier.ParticipantJoined(call.Id, joined.Participants.Single(p => p.MembershipId == membership.Id));
            await notifier.CallChanged(popkin.Id, call.Id, call.Version, joined.Call.ParticipantCount);
            return new JoinCallResult(joined, started);
        }
    }

    private async Task<JoinedCallDto> JoinedAsync(Call call, Membership membership, CancellationToken cancellationToken)
    {
        var participants = await CallReads.ParticipantsAsync(db, call.Id, photos, cancellationToken);
        return new JoinedCallDto(CallDto.Of(call, participants.Count), membership.Id, participants, relay.IssueFor(membership.Id));
    }
}
