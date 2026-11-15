using Popkin.Application.Abstractions;

namespace Popkin.Api.Platform;

/// <summary>
/// Refreshes the platform snapshot before the rate limiter and the controllers read it, so every
/// later reader asks it synchronously (L2-076 AC10, ADR 0024).
/// </summary>
public sealed class PlatformSnapshotMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IPlatformSnapshot snapshot)
    {
        await snapshot.RefreshIfStaleAsync(context.RequestAborted);
        await next(context);
    }
}
