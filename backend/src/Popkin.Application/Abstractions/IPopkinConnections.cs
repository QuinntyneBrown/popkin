namespace Popkin.Application.Abstractions;

/// <summary>
/// Which hub connections are sent a Popkin's events and a call's. A handler decides it, from
/// membership and from who is on the call; the hub only carries it out.
/// </summary>
public interface IPopkinConnections
{
    /// <summary>From now on the connection is sent the events of that Popkin.</summary>
    Task AddToPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken);

    /// <summary>The connection is sent no more of that Popkin's events.</summary>
    Task RemoveFromPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken);

    /// <summary>From now on the connection is sent the events of that call.</summary>
    Task AddToCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken);

    /// <summary>The connection is sent no more of that call's events.</summary>
    Task RemoveFromCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken);
}
