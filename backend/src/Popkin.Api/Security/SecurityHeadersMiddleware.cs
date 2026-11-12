namespace Popkin.Api.Security;

/// <summary>
/// Headers on every API response (L2-054 AC1): no sniffing, no framing by other sites, a content
/// security policy that allows no script at all (the API serves JSON), no referrer, and no caching
/// of answers. HTTPS redirection and HSTS are added outside Development in Program.cs.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            // The API's own answers; Swagger's page (outside Production) keeps its scripts.
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
                headers.CacheControl = "no-store";
            }

            return Task.CompletedTask;
        });
        return next(context);
    }
}
