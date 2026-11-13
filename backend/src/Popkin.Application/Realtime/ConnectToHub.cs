using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;

namespace Popkin.Application.Realtime;

/// <summary>
/// A person opened a connection to the hub. The person comes from the connection's session,
/// never from what the client says. The connection is sent the events of every Popkin they are
/// a member of, and of no other: membership alone decides it (L2-051). They are then here now
/// in each.
/// </summary>
public sealed record ConnectToHubCommand(Guid PersonId, string ConnectionId) : IRequest;

public sealed class ConnectToHubCommandHandler(IAppDbContext db, IPopkinConnections connections, PresenceTracker presence)
    : IRequestHandler<ConnectToHubCommand>
{
    public async Task Handle(ConnectToHubCommand request, CancellationToken cancellationToken)
    {
        var popkinIds = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == request.PersonId && m.LeftAt == null)
            .Select(m => m.PopkinId)
            .ToListAsync(cancellationToken);
        foreach (var popkinId in popkinIds)
        {
            await connections.AddToPopkinAsync(request.ConnectionId, popkinId, cancellationToken);
        }

        // After the connection receives each Popkin's events, so it is told of its own arrival.
        presence.Connect(request.ConnectionId, request.PersonId, popkinIds);
    }
}

/// <summary>
/// A connection to the hub closed. Its person is released from "here now" after the grace
/// (see <see cref="PresenceTracker"/>), and a participant who was on a call with it leaves
/// that call after theirs, unless they come back (see <see cref="CallDisconnectGrace"/>).
/// </summary>
public sealed record DisconnectFromHubCommand(string ConnectionId) : IRequest;

public sealed class DisconnectFromHubCommandHandler(PresenceTracker presence, IAppDbContext db, CallDisconnectGrace callGrace)
    : IRequestHandler<DisconnectFromHubCommand>
{
    public async Task Handle(DisconnectFromHubCommand request, CancellationToken cancellationToken)
    {
        presence.Disconnect(request.ConnectionId);

        var onCalls = await db.CallParticipants.AsNoTracking()
            .Where(p => p.ConnectionId == request.ConnectionId && p.LeftAt == null)
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);
        foreach (var participantId in onCalls)
        {
            callGrace.Start(participantId, request.ConnectionId);
        }
    }
}
