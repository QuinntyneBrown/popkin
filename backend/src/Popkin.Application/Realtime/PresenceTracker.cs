namespace Popkin.Application.Realtime;

/// <summary>"Here now" of one Popkin: the count and the version it was reached at.</summary>
public readonly record struct PresenceSnapshot(Guid PopkinId, long Version, int HereNow);

/// <summary>
/// Who has Popkin open at this moment, per Popkin. A person counts once however many tabs and
/// devices they hold. Each Popkin has a version that rises with every change of its count, so
/// a client can drop an older `PresenceChanged`. A dropped connection releases its person only
/// after <see cref="Grace"/> without a reconnect by the same person, so the count does not
/// flicker with every tunnel.
///
/// One instance, guarded by one lock, because many connections read and write it at once. It is
/// in-process, which is right for the one API instance of ADR 0009.
/// </summary>
public sealed class PresenceTracker(TimeProvider clock)
{
    /// <summary>How long a person still counts after their last connection dropped.</summary>
    public static readonly TimeSpan Grace = TimeSpan.FromSeconds(20);

    private readonly object _gate = new();
    private readonly Dictionary<string, Connection> _connections = [];
    private readonly Dictionary<Guid, PopkinPresence> _popkins = [];

    /// <summary>
    /// Raised after the count of a Popkin changed, outside the lock. Two changes may be raised
    /// out of order; the version says which is the later.
    /// </summary>
    public event Action<PresenceSnapshot>? Changed;

    public PresenceSnapshot Get(Guid popkinId)
    {
        lock (_gate)
        {
            return _popkins.TryGetValue(popkinId, out var popkin) ? popkin.Snapshot(popkinId) : new PresenceSnapshot(popkinId, 0, 0);
        }
    }

    /// <summary>The people who are here now, each once.</summary>
    public IReadOnlyCollection<Guid> PeopleHere(Guid popkinId)
    {
        lock (_gate)
        {
            return _popkins.TryGetValue(popkinId, out var popkin) ? popkin.People.Keys.ToList() : [];
        }
    }

    /// <summary>A person opened a connection: they are here in each of their Popkins.</summary>
    public void Connect(string connectionId, Guid personId, IEnumerable<Guid> popkinIds)
    {
        var changes = new List<PresenceSnapshot>();
        lock (_gate)
        {
            if (!_connections.TryGetValue(connectionId, out var connection))
            {
                connection = new Connection(personId);
                _connections.Add(connectionId, connection);
            }

            foreach (var popkinId in popkinIds)
            {
                Hold(connection, popkinId, changes);
            }
        }

        Raise(changes);
    }

    /// <summary>
    /// A person became a member of a Popkin: the connections they already hold are here in it.
    /// Returns those connections, so they can be sent the Popkin's events.
    /// </summary>
    public IReadOnlyList<string> Join(Guid personId, Guid popkinId)
    {
        var changes = new List<PresenceSnapshot>();
        List<string> connectionIds;
        lock (_gate)
        {
            var held = _connections.Where(c => c.Value.PersonId == personId).ToList();
            connectionIds = held.Select(c => c.Key).ToList();
            foreach (var (_, connection) in held)
            {
                Hold(connection, popkinId, changes);
            }
        }

        Raise(changes);
        return connectionIds;
    }

    /// <summary>
    /// A connection closed. When it was the person's last in a Popkin, they still count for
    /// <see cref="Grace"/>, and are released then unless they have reconnected.
    /// </summary>
    public void Disconnect(string connectionId)
    {
        lock (_gate)
        {
            if (!_connections.Remove(connectionId, out var connection))
            {
                return;
            }

            foreach (var popkinId in connection.PopkinIds)
            {
                var person = _popkins[popkinId].People[connection.PersonId];
                person.Connections--;
                if (person.Connections == 0)
                {
                    // A timer of the clock, so the grace can be passed in a test without waiting for it.
                    var leaving = new object();
                    person.Leaving = leaving;
                    person.Timer = clock.CreateTimer(
                        _ => Release(popkinId, connection.PersonId, leaving), null, Grace, Timeout.InfiniteTimeSpan);
                }
            }
        }
    }

    private void Hold(Connection connection, Guid popkinId, List<PresenceSnapshot> changes)
    {
        if (!connection.PopkinIds.Add(popkinId))
        {
            return;
        }

        if (!_popkins.TryGetValue(popkinId, out var popkin))
        {
            popkin = new PopkinPresence();
            _popkins.Add(popkinId, popkin);
        }

        if (popkin.People.TryGetValue(connection.PersonId, out var person))
        {
            // Back within the grace, or on another tab: the count does not change.
            person.Connections++;
            person.Leaving = null;
            person.Timer?.Dispose();
            person.Timer = null;
            return;
        }

        popkin.People.Add(connection.PersonId, new PersonPresence { Connections = 1 });
        popkin.Version++;
        changes.Add(popkin.Snapshot(popkinId));
    }

    private void Release(Guid popkinId, Guid personId, object leaving)
    {
        PresenceSnapshot change;
        lock (_gate)
        {
            var popkin = _popkins[popkinId];
            // Only the grace that is still running releases: a reconnect in between cancelled this one.
            if (!popkin.People.TryGetValue(personId, out var person) || !ReferenceEquals(person.Leaving, leaving))
            {
                return;
            }

            person.Timer?.Dispose();
            popkin.People.Remove(personId);
            popkin.Version++;
            change = popkin.Snapshot(popkinId);
        }

        Raise([change]);
    }

    private void Raise(List<PresenceSnapshot> changes)
    {
        foreach (var change in changes)
        {
            Changed?.Invoke(change);
        }
    }

    private sealed class Connection(Guid personId)
    {
        public Guid PersonId { get; } = personId;

        public HashSet<Guid> PopkinIds { get; } = [];
    }

    private sealed class PersonPresence
    {
        public int Connections { get; set; }

        /// <summary>The grace that is running, when the person holds no connection.</summary>
        public object? Leaving { get; set; }

        public ITimer? Timer { get; set; }
    }

    /// <summary>Kept when nobody is here, so the version never starts again.</summary>
    private sealed class PopkinPresence
    {
        public long Version { get; set; }

        public Dictionary<Guid, PersonPresence> People { get; } = [];

        public PresenceSnapshot Snapshot(Guid popkinId) => new(popkinId, Version, People.Count);
    }
}
