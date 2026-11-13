using System.Collections.Concurrent;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Calls;

/// <summary>
/// The grace a participant has after the connection they are on a call with dropped, or after
/// joining a call before any connection of theirs is on it. The
/// client tries again 0, 2 and 12 seconds after a drop, all inside the grace; a participant
/// who has not come back when it ends leaves the call. The grace is a timer of the clock, so
/// a test passes it without waiting. Kept in this process: one API instance (ADR 0009).
/// </summary>
public sealed class CallDisconnectGrace(TimeProvider clock, IServiceScopeFactory scopes, ILogger<CallDisconnectGrace> logger)
{
    /// <summary>How long a participant stays on a call after their connection dropped.</summary>
    public static readonly TimeSpan Grace = TimeSpan.FromSeconds(20);

    /// <summary>The graces that are running, held so that none is collected before it ends.</summary>
    private readonly ConcurrentDictionary<object, ITimer> _running = new();

    /// <summary>
    /// The connection a participant was on the call with has gone, or (with no connection) they
    /// have just joined and none is on the call yet: their grace starts.
    /// </summary>
    public void Start(Guid participantId, string? connectionId)
    {
        var grace = new object();
        _running[grace] = clock.CreateTimer(_ => _ = EndAsync(grace, participantId, connectionId), null, Grace, Timeout.InfiniteTimeSpan);
    }

    private async Task EndAsync(object grace, Guid participantId, string? connectionId)
    {
        if (_running.TryRemove(grace, out var timer))
        {
            await timer.DisposeAsync();
        }

        try
        {
            // No request is being answered, so the grace has its own unit of work.
            await using var scope = scopes.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<ISender>().Send(new LeaveDroppedCallCommand(participantId, connectionId));
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "A participant whose connection dropped could not be taken off their call");
        }
    }
}

/// <summary>
/// The grace of a dropped connection, or of a join no connection followed, has ended. The
/// participant leaves the call unless they came, or came back, which shows in the connection
/// they are on the call with: `JoinCall` set or replaced it.
/// </summary>
public sealed record LeaveDroppedCallCommand(Guid ParticipantId, string? ConnectionId) : IRequest;

public sealed class LeaveDroppedCallCommandHandler(IAppDbContext db, CallLeaver leaver) : IRequestHandler<LeaveDroppedCallCommand>
{
    public async Task Handle(LeaveDroppedCallCommand request, CancellationToken cancellationToken)
    {
        var stillDropped = await db.CallParticipants.AsNoTracking().AnyAsync(
            p => p.Id == request.ParticipantId && p.LeftAt == null && p.ConnectionId == request.ConnectionId, cancellationToken);
        if (stillDropped)
        {
            await leaver.LeaveAsync(request.ParticipantId, cancellationToken);
        }
    }
}
