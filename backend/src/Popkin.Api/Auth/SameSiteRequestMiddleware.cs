using Microsoft.AspNetCore.Mvc;

namespace Popkin.Api.Auth;

/// <summary>
/// Same-site proof for every change (L2-050 AC2): a POST, PUT, PATCH or DELETE under /api, and
/// every request under /hubs, is accepted when `Sec-Fetch-Site` is `same-origin`, or, where a
/// client sends no fetch metadata, when `Origin` is the app's origin (`App:Origin`) or absent.
/// Otherwise 403 `cross_site_request`. With the Strict cookie it closes cross-site request
/// forgery. The hub is checked whatever the method, because a WebSocket opens with a GET and a
/// browser sends its `Origin` with it: the hub accepts a connection from the app's own origin only.
/// </summary>
public sealed class SameSiteRequestMiddleware(RequestDelegate next, IConfiguration configuration)
{
    private readonly string? _origin = configuration["App:Origin"]?.TrimEnd('/');

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsChange(context.Request) && !IsSameSite(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            var details = new ProblemDetails { Status = 403, Title = "This request came from another site." };
            details.Extensions["code"] = "cross_site_request";
            await context.RequestServices.GetRequiredService<IProblemDetailsService>()
                .WriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = details });
            return;
        }

        await next(context);
    }

    private static bool IsChange(HttpRequest request) =>
        request.Path.StartsWithSegments("/hubs")
        || ((HttpMethods.IsPost(request.Method) || HttpMethods.IsPut(request.Method) || HttpMethods.IsPatch(request.Method) || HttpMethods.IsDelete(request.Method))
            && request.Path.StartsWithSegments("/api"));

    private bool IsSameSite(HttpRequest request)
    {
        var site = request.Headers["Sec-Fetch-Site"].ToString();
        if (!string.IsNullOrEmpty(site))
        {
            return site is "same-origin";
        }

        var origin = request.Headers.Origin.ToString();
        return string.IsNullOrEmpty(origin) || string.Equals(origin.TrimEnd('/'), _origin, StringComparison.OrdinalIgnoreCase);
    }
}
