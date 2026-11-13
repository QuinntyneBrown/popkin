using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Popkin.Api.RateLimiting;

/// <summary>The rate-limiter policies of Abuse limits (docs/detailed-designs/security/abuse-limits).</summary>
public static class RateLimitPolicyNames
{
    /// <summary>10 code requests per address per 10 minutes (L2-053 AC1).</summary>
    public const string CodesPerAddress = "codes-per-address";

    /// <summary>20 invite codes tried per address per 10 minutes (L2-053 AC3).</summary>
    public const string InviteCodes = "invite-codes";

    public static IServiceCollection AddPopkinRateLimits(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(CodesPerAddress, context => PerAddress(context, permits: 10));
            options.AddPolicy(InviteCodes, context => PerAddress(context, permits: 20));

            options.OnRejected = async (context, cancellationToken) =>
            {
                var seconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                    ? (int)Math.Ceiling(retryAfter.TotalSeconds)
                    : 600;
                var http = context.HttpContext;
                http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                http.Response.Headers.RetryAfter = seconds.ToString();
                var details = new ProblemDetails { Status = 429, Title = "Too many requests for now." };
                details.Extensions["code"] = "rate_limited";
                details.Extensions["retryAfterSeconds"] = seconds;
                await http.RequestServices.GetRequiredService<IProblemDetailsService>()
                    .WriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = details });
            };
        });
        return services;
    }

    private static RateLimitPartition<string> PerAddress(HttpContext context, int permits) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
            });
}
