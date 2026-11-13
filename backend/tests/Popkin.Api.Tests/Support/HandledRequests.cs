using MediatR;

namespace Popkin.Api.Tests.Support;

/// <summary>
/// The MediatR requests the API has finished handling, so a test can await work the server
/// does on its own time, such as noticing that a hub connection closed, instead of sleeping
/// (ADR 0010). A wait that times out fails naming the requests that were handled.
/// </summary>
public sealed class HandledRequests
{
    private readonly object _gate = new();
    private readonly List<Type> _handled = [];
    private TaskCompletionSource _next = new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>Waits until `count` requests of that type have been handled since the fixture started.</summary>
    public async Task WaitForAsync<TRequest>(int count = 1, TimeSpan? timeout = null)
    {
        var wait = timeout ?? TimeSpan.FromSeconds(5);
        using var deadline = new CancellationTokenSource(wait);
        while (true)
        {
            Task next;
            lock (_gate)
            {
                if (_handled.Count(t => t == typeof(TRequest)) >= count)
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
                string handled;
                lock (_gate)
                {
                    handled = _handled.Count == 0 ? "nothing" : string.Join(", ", _handled.Select(t => t.Name));
                }

                Assert.Fail($"{typeof(TRequest).Name} was not handled {count} time(s) within {wait.TotalSeconds:0.###} s. Handled: {handled}");
            }
        }
    }

    private void Add(Type request)
    {
        TaskCompletionSource next;
        lock (_gate)
        {
            _handled.Add(request);
            next = _next;
            _next = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        next.SetResult();
    }

    public sealed class Behavior<TRequest, TResponse>(HandledRequests handled) : IPipelineBehavior<TRequest, TResponse>
        where TRequest : notnull
    {
        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            try
            {
                return await next();
            }
            finally
            {
                handled.Add(typeof(TRequest));
            }
        }
    }
}
