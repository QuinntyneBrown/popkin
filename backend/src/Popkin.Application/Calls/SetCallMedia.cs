using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;

namespace Popkin.Application.Calls;

/// <summary>
/// Records the member's own microphone and camera on the call they are on, each only when
/// given, so the others show the muted icon or the avatar (L2-030 AC2, AC3). The browser has
/// turned the track off already; this is the record of it.
/// </summary>
public sealed record SetCallMediaCommand(Guid PopkinId, Guid CallId, bool? MicOn, bool? CameraOn) : IRequest;

public sealed class SetCallMediaCommandHandler(IAppDbContext db, IMembershipGuard guard, IPopkinNotifier notifier)
    : IRequestHandler<SetCallMediaCommand>
{
    public async Task Handle(SetCallMediaCommand request, CancellationToken cancellationToken)
    {
        // A wrap-up ended the call, so nothing of it changes afterwards (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        if (request.MicOn is null && request.CameraOn is null)
        {
            throw ProblemException.Invalid("validation_failed", "Say whether the microphone or the camera is on.", "micOn");
        }

        var participantId = await CallReads.ParticipantIdAsync(db, popkin.Id, request.CallId, membership.Id, cancellationToken)
            ?? throw CallProblems.NotFound();
        var participant = await db.CallParticipants.FirstAsync(p => p.Id == participantId, cancellationToken);
        if (!participant.SetMedia(request.MicOn, request.CameraOn))
        {
            return;
        }

        await db.SaveChangesAsync(cancellationToken);
        // Told after the commit: a state, with both values in full and a version that only rises.
        await notifier.ParticipantMediaChanged(
            participant.CallId, membership.Id, participant.MediaVersion, participant.MicOn, participant.CameraOn);
    }
}
