using Microsoft.AspNetCore.SignalR;
using Popkin.Application.Problems;

namespace Popkin.Api.Hubs;

/// <summary>
/// Turns a <see cref="ProblemException"/> thrown for a hub call into a `HubException` whose
/// message is the problem's `code`, so a client branches on one vocabulary for HTTP and the
/// hub. Nothing else of the refusal is sent, and any other failure stays the hub's plain
/// error (L2-052 AC5).
/// </summary>
public sealed class ProblemHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext invocationContext, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        try
        {
            return await next(invocationContext);
        }
        catch (ProblemException problem)
        {
            throw new HubException(problem.Code);
        }
    }
}
