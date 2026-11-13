using MediatR;

namespace Popkin.Worker.Tests;

/// <summary>
/// Stands in for MediatR: keeps every request a job sends, so a test awaits a send instead of
/// sleeping (ADR 0010). A wait that times out fails naming what was sent.
/// </summary>
public sealed class RecordingSender : ISender
{
    private readonly object _gate = new();
    private readonly List<object> _sent = [];
    private TaskCompletionSource _next = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>The sends, counted from 1, that throw as a handler that failed would.</summary>
    public HashSet<int> Failing { get; } = [];

    public IReadOnlyList<object> Sent
    {
        get
        {
            lock (_gate)
            {
                return _sent.ToList();
            }
        }
    }

    /// <summary>Waits until `count` requests have been sent since the test started.</summary>
    public async Task WaitForAsync(int count, TimeSpan? timeout = null)
    {
        var wait = timeout ?? TimeSpan.FromSeconds(5);
        using var deadline = new CancellationTokenSource(wait);
        while (true)
        {
            Task next;
            lock (_gate)
            {
                if (_sent.Count >= count)
                {
                    return;
                }

                next = _next.Task;
            }

            try
            {
                await next.WaitAsync(deadline.Token);
            }
            catch (OperationCanceledException)
            {
                var sent = Sent;
                Assert.Fail(
                    $"{count} request(s) were not sent within {wait.TotalSeconds:0.###} s. Sent: "
                    + (sent.Count == 0 ? "nothing" : string.Join(", ", sent.Select(s => s.GetType().Name))));
            }
        }
    }

    public Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default)
    {
        Record(request);
        return Task.FromResult(default(TResponse)!);
    }

    public Task Send<TRequest>(TRequest request, CancellationToken cancellationToken = default)
        where TRequest : IRequest
    {
        Record(request);
        return Task.CompletedTask;
    }

    public Task<object?> Send(object request, CancellationToken cancellationToken = default)
    {
        Record(request);
        return Task.FromResult<object?>(null);
    }

    public IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse> request, CancellationToken cancellationToken = default) =>
        throw new NotSupportedException();

    public IAsyncEnumerable<object?> CreateStream(object request, CancellationToken cancellationToken = default) =>
        throw new NotSupportedException();

    private void Record(object request)
    {
        TaskCompletionSource next;
        int number;
        lock (_gate)
        {
            _sent.Add(request);
            number = _sent.Count;
            next = _next;
            _next = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        next.SetResult();
        if (Failing.Contains(number))
        {
            throw new InvalidOperationException("Simulated failure of a handler.");
        }
    }
}
