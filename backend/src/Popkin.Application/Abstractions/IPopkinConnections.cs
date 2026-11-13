namespace Popkin.Application.Abstractions;

/// <summary>
/// Which hub connections are sent a Popkin's events. A handler decides it, from membership;
/// the hub only carries it out.
/// </summary>
public interface IPopkinConnections
{
    /// <summary>From now on the connection is sent the events of that Popkin.</summary>
    Task AddToPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken);
}
