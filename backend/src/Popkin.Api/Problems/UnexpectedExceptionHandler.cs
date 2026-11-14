using System.Security.Cryptography;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Popkin.Api.Problems;

/// <summary>A short identifier of one server failure, shown to the person and written to the log.</summary>
public readonly record struct ReferenceCode(string Value)
{
    public static ReferenceCode New()
    {
        var hex = Convert.ToHexString(RandomNumberGenerator.GetBytes(4));
        return new ReferenceCode($"PK-{hex[..4]}-{hex[4..]}");
    }

    public override string ToString() => Value;
}

/// <summary>
/// Any failure nothing else handled: logged with a reference code, answered as a 500
/// ProblemDetails with `code` `server_error` and that `reference`, and nothing internal
/// (L2-056 AC6, L2-052 AC5).
/// </summary>
public sealed class UnexpectedExceptionHandler(IProblemDetailsService problems, ILogger<UnexpectedExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var reference = ReferenceCode.New();
        // The route by its template, never the path: a path carries ids and what a person chose,
        // such as the emoji of a reaction (ADR 0012).
        // The middleware clears the endpoint before it hands the failure on; its feature keeps it.
        var endpoint = httpContext.Features.Get<IExceptionHandlerFeature>()?.Endpoint ?? httpContext.GetEndpoint();
        var route = (endpoint as RouteEndpoint)?.RoutePattern.RawText ?? "(no route)";
        logger.LogError(exception, "Unexpected failure {Reference} on {Method} {Route} ({TraceId})",
            reference, httpContext.Request.Method, route, httpContext.TraceIdentifier);
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        var details = new ProblemDetails { Status = 500, Title = "Something went wrong" };
        details.Extensions["code"] = "server_error";
        details.Extensions["reference"] = reference.Value;
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = details, Exception = null });
    }
}
