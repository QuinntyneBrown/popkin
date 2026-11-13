using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;

namespace Popkin.Application.Calls;

/// <summary>
/// One step of setting up a media path between two browsers: a WebRTC session description
/// (`offer`, `answer`) or an ICE `candidate`. The payload is the browsers' own; the API relays
/// it and never reads or logs it.
/// </summary>
public sealed record CallSignalDto(string? Type, string? Payload)
{
    /// <summary>An offer or an answer is at most 32 KB.</summary>
    public const int MaxDescriptionBytes = 32 * 1024;

    /// <summary>A candidate is at most 2 KB.</summary>
    public const int MaxCandidateBytes = 2 * 1024;
}

/// <summary>
/// A participant sends a signal to one other participant of the same call. The sender comes
/// from the connection's session. A signal is an edge: it is relayed once, as sent, or the
/// call fails; it is never coalesced or dropped.
/// </summary>
public sealed record RelaySignalCommand(Guid PersonId, Guid CallId, Guid ToMembershipId, CallSignalDto? Signal) : IRequest;

public sealed class RelaySignalCommandHandler(IAppDbContext db, IPopkinNotifier notifier) : IRequestHandler<RelaySignalCommand>
{
    public async Task Handle(RelaySignalCommand request, CancellationToken cancellationToken)
    {
        var signal = Validated(request.Signal);

        // Both ends are on the call, and the target has a connection on it; anything else is
        // call_not_found, which says nothing of a call the sender is not on (L2-051).
        var sender = await CallReads.OnCallAsync(db, request.PersonId, request.CallId, cancellationToken)
            ?? throw CallProblems.NotFound();
        var connectionId = await db.CallParticipants.AsNoTracking()
            .Where(p => p.CallId == request.CallId && p.MembershipId == request.ToMembershipId && p.LeftAt == null)
            .Select(p => p.ConnectionId)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw CallProblems.NotFound();

        await notifier.Signal(connectionId, request.CallId, sender.MembershipId, signal);
    }

    /// <summary>The rules of a signal (L2-052 AC1). Only the size of the payload is looked at.</summary>
    private static CallSignalDto Validated(CallSignalDto? signal)
    {
        var limit = signal?.Type switch
        {
            "offer" or "answer" => CallSignalDto.MaxDescriptionBytes,
            "candidate" => CallSignalDto.MaxCandidateBytes,
            _ => throw ProblemException.Invalid("validation_failed", "A signal is an offer, an answer or a candidate.", "type"),
        };
        if (string.IsNullOrEmpty(signal!.Payload) || Encoding.UTF8.GetByteCount(signal.Payload) > limit)
        {
            throw ProblemException.Invalid("validation_failed", "A signal's payload is missing or too large.", "payload");
        }

        return signal;
    }
}
