using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Problems;

namespace Popkin.Api.Problems;

/// <summary>
/// Turns a <see cref="ProblemException"/> into ProblemDetails with its `code`, its `field` and,
/// for 429, `Retry-After` and `retryAfterSeconds` (L2-052 AC1, L2-053 AC4). It writes no stack
/// trace, query or internal name (L2-052 AC5).
/// </summary>
public sealed class ProblemExceptionHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ProblemException problem)
        {
            return false;
        }

        httpContext.Response.StatusCode = problem.Status;
        var details = new ProblemDetails { Status = problem.Status, Title = problem.Title };
        details.Extensions["code"] = problem.Code;
        if (problem.Field is not null)
        {
            details.Extensions["field"] = problem.Field;
        }

        if (problem.RetryAfter is { } retryAfter)
        {
            var seconds = (int)Math.Ceiling(retryAfter.TotalSeconds);
            httpContext.Response.Headers.RetryAfter = seconds.ToString();
            details.Extensions["retryAfterSeconds"] = seconds;
        }

        foreach (var (key, value) in problem.Extensions)
        {
            details.Extensions[key] = value;
        }

        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = details });
    }
}
