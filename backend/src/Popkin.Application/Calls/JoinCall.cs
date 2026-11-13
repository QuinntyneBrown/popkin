using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Calls;

/// <summary>`Started` is true when this request started the call.</summary>
public sealed record JoinCallResult(JoinedCallDto Joined, bool Started);

/// <summary>Starts the Popkin's group call, with the microphone and camera as the member arrives (L2-029 AC1).</summary>
public sealed record JoinCallCommand(Guid PopkinId, bool MicOn, bool CameraOn) : IRequest<JoinCallResult>;

public sealed class JoinCallCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore photos, IMediaRelayCredentials relay)
    : IRequestHandler<JoinCallCommand, JoinCallResult>
{
    public async Task<JoinCallResult> Handle(JoinCallCommand request, CancellationToken cancellationToken)
    {
        // No call starts in a Popkin that has wrapped up (L2-045 AC1).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);

        var now = clock.GetUtcNow();
        var call = Call.Start(popkin.Id, now);
        var participant = call.Join(membership.Id, request.MicOn, request.CameraOn, now);
        db.Calls.Add(call);
        db.CallParticipants.Add(participant);
        await db.SaveChangesAsync(cancellationToken);

        var joined = new JoinedCallDto(
            CallDto.Of(call, 1),
            membership.Id,
            [CallParticipantDto.Of(participant, membership, photos)],
            relay.IssueFor(membership.Id));
        return new JoinCallResult(joined, Started: true);
    }
}
