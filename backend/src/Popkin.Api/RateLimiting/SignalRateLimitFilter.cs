using Microsoft.AspNetCore.SignalR;
using Popkin.Api.Hubs;

namespace Popkin.Api.RateLimiting;

/// <summary>
/// The call-signal limit of Abuse limits: at most 600 `SendSignal` a minute per hub connection,
/// so one participant cannot flood another's browser (L2-053). A signal over the limit fails
/// the hub call with `rate_limited`; it is never dropped unseen, because a signal is an edge
/// that must arrive or fail visibly. The count lives with the connection and goes with it
/// (one API instance, ADR 0009).
/// </summary>
public sealed class SignalRateLimitFilter(TimeProvider clock) : IHubFilter
{
    public const int PermitLimit = 600;

    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    private static readonly object LimiterKey = new();

    public ValueTask<object?> InvokeMethodAsync(HubInvocationContext invocationContext, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        if (invocationContext.HubMethodName == nameof(PopkinHub.SendSignal))
        {
            using var lease = LimiterOf(invocationContext.Context).AttemptAcquire();
            if (!lease.IsAcquired)
            {
                throw new HubException("rate_limited");
            }
        }

        return next(invocationContext);
    }

    private SlidingLogRateLimiter LimiterOf(HubCallerContext connection)
    {
        // A connection's calls are handled one at a time, so its items need no lock.
        if (connection.Items[LimiterKey] is not SlidingLogRateLimiter limiter)
        {
            limiter = new SlidingLogRateLimiter(PermitLimit, Window, clock);
            connection.Items[LimiterKey] = limiter;
        }

        return limiter;
    }
}
