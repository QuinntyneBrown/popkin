using System.Threading.RateLimiting;

namespace Popkin.Api.RateLimiting;

/// <summary>
/// At most `permitLimit` permits within any `window`, counted from the times the permits were
/// taken. Unlike a fixed window it cannot be doubled across a window's edge, and it reads the
/// time from <see cref="TimeProvider"/>, so the answer of "when may I try again" is exact.
/// It never queues: a request over the limit is refused at once.
/// </summary>
public sealed class SlidingLogRateLimiter(int permitLimit, TimeSpan window, TimeProvider clock) : RateLimiter
{
    private readonly Queue<DateTimeOffset> _taken = new();
    private readonly object _gate = new();
    private DateTimeOffset _lastUsed = clock.GetUtcNow();
    private long _successful;
    private long _failed;

    /// <summary>Null while any permit is still counted, so the limiter is not discarded with its count.</summary>
    public override TimeSpan? IdleDuration
    {
        get
        {
            lock (_gate)
            {
                var now = clock.GetUtcNow();
                Expire(now);
                return _taken.Count > 0 ? null : now - _lastUsed;
            }
        }
    }

    public override RateLimiterStatistics? GetStatistics()
    {
        lock (_gate)
        {
            Expire(clock.GetUtcNow());
            return new RateLimiterStatistics
            {
                CurrentAvailablePermits = permitLimit - _taken.Count,
                CurrentQueuedCount = 0,
                TotalSuccessfulLeases = _successful,
                TotalFailedLeases = _failed,
            };
        }
    }

    protected override RateLimitLease AttemptAcquireCore(int permitCount)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThan(permitCount, permitLimit);
        lock (_gate)
        {
            var now = clock.GetUtcNow();
            Expire(now);
            _lastUsed = now;
            if (_taken.Count + permitCount > permitLimit)
            {
                _failed++;
                // Enough permits are free once the oldest ones that stand in the way have aged out.
                var blocking = _taken.ElementAt(_taken.Count + permitCount - permitLimit - 1);
                return new Lease(blocking + window - now);
            }

            for (var taken = 0; taken < permitCount; taken++)
            {
                _taken.Enqueue(now);
            }

            _successful++;
            return new Lease(null);
        }
    }

    protected override ValueTask<RateLimitLease> AcquireAsyncCore(int permitCount, CancellationToken cancellationToken) =>
        ValueTask.FromResult(AttemptAcquireCore(permitCount));

    private void Expire(DateTimeOffset now)
    {
        while (_taken.TryPeek(out var oldest) && oldest + window <= now)
        {
            _taken.Dequeue();
        }
    }

    private sealed class Lease(TimeSpan? retryAfter) : RateLimitLease
    {
        public override bool IsAcquired => retryAfter is null;

        public override IEnumerable<string> MetadataNames => retryAfter is null ? [] : [MetadataName.RetryAfter.Name];

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (retryAfter is { } wait && metadataName == MetadataName.RetryAfter.Name)
            {
                metadata = wait;
                return true;
            }

            metadata = null;
            return false;
        }
    }
}
