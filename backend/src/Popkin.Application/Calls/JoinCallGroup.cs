using MediatR;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Calls;

/// <summary>
/// A hub connection says it is the one its person is on that call with. The person comes from
/// the connection's session. Only someone on the call is let in; anyone else gets
/// `call_not_found`, whether or not the call exists (L2-051). The connection replaces the one
/// the participant held, so a participant who reconnects is reached again.
/// </summary>
public sealed record JoinCallGroupCommand(Guid PersonId, Guid CallId, string ConnectionId) : IRequest;

public sealed class JoinCallGroupCommandHandler(IAppDbContext db, IPopkinConnections connections) : IRequestHandler<JoinCallGroupCommand>
{
    public async Task Handle(JoinCallGroupCommand request, CancellationToken cancellationToken)
    {
        var participant = await CallReads.OnCallAsync(db, request.PersonId, request.CallId, cancellationToken)
            ?? throw CallProblems.NotFound();
        var replaced = participant.ConnectionId;
        participant.Connect(request.ConnectionId);
        await db.SaveChangesAsync(cancellationToken);

        if (replaced is not null && replaced != request.ConnectionId)
        {
            await connections.RemoveFromCallAsync(replaced, request.CallId, cancellationToken);
        }

        await connections.AddToCallAsync(request.ConnectionId, request.CallId, cancellationToken);
    }
}
