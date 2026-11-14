using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;

namespace Popkin.Api.Tests.Support;

/// <summary>One event a hub client received: its name and its arguments as sent.</summary>
public sealed record HubEvent(string Name, IReadOnlyList<JsonElement> Arguments)
{
    public override string ToString() => $"{Name}({string.Join(", ", Arguments.Select(a => a.GetRawText()))})";
}

/// <summary>
/// Collects the events one hub connection receives, in the order they arrive, and awaits the
/// first that matches (ADR 0010). A test never sleeps: it waits for an event, and a wait that
/// times out fails naming the events that did arrive.
/// </summary>
public sealed class HubEvents : IAsyncDisposable
{
    /// <summary>Every event `PopkinHub` sends, with the number of arguments it carries.</summary>
    private static readonly (string Name, int Arguments)[] Known =
    [
        ("MessageAdded", 1),
        ("MessageDeleted", 2),
        ("ReactionsChanged", 3),
        ("ThreadRead", 1),
        ("PresenceChanged", 3),
        ("MemberJoined", 2),
        ("MemberLeft", 2),
        ("PhotosAdded", 2),
        ("CallChanged", 5),
        ("CallEnded", 3),
        ("ParticipantJoined", 2),
        ("ParticipantLeft", 2),
        ("ParticipantMediaChanged", 5),
        ("Signal", 3),
        ("PopkinWrappedUp", 1),
    ];

    private readonly object _gate = new();
    private readonly List<HubEvent> _received = [];
    private TaskCompletionSource _arrived = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public HubEvents(HubConnection connection)
    {
        Connection = connection;
        foreach (var (name, arguments) in Known)
        {
            connection.On(name, Enumerable.Repeat(typeof(JsonElement), arguments).ToArray(), received =>
            {
                Add(new HubEvent(name, received.Select(a => (JsonElement)a!).ToList()));
                return Task.CompletedTask;
            });
        }
    }

    public HubConnection Connection { get; }

    /// <summary>The events received so far, in the order they arrived.</summary>
    public IReadOnlyList<HubEvent> Received
    {
        get
        {
            lock (_gate)
            {
                return _received.ToList();
            }
        }
    }

    public IReadOnlyList<HubEvent> ReceivedNamed(string name) => Received.Where(e => e.Name == name).ToList();

    /// <summary>
    /// The first event of that name that matches, whether it has arrived already or arrives
    /// within the timeout (5 seconds unless given).
    /// </summary>
    public async Task<HubEvent> WaitForAsync(string name, Func<HubEvent, bool>? match = null, TimeSpan? timeout = null)
    {
        var wait = timeout ?? TimeSpan.FromSeconds(5);
        using var deadline = new CancellationTokenSource(wait);
        while (true)
        {
            Task arrived;
            lock (_gate)
            {
                if (_received.FirstOrDefault(e => e.Name == name && (match is null || match(e))) is { } found)
                {
                    return found;
                }

                arrived = _arrived.Task;
            }

            try
            {
                await arrived.WaitAsync(deadline.Token);
            }
            catch (OperationCanceledException)
            {
                var received = Received;
                Assert.Fail(
                    $"No matching {name} arrived within {wait.TotalSeconds:0.###} s. Received: "
                    + (received.Count == 0 ? "nothing" : string.Join("; ", received)));
            }
        }
    }

    public async ValueTask DisposeAsync() => await Connection.DisposeAsync();

    private void Add(HubEvent received)
    {
        TaskCompletionSource arrived;
        lock (_gate)
        {
            _received.Add(received);
            arrived = _arrived;
            _arrived = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        arrived.SetResult();
    }
}
