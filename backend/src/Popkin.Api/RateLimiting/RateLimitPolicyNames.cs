using System.Security.Claims;
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

    /// <summary>60 messages per person per minute (L2-053 AC2); a rating of an experience and a comment on one count with them.</summary>
    public const string Messages = "messages";

    /// <summary>60 photos added per person per minute: three full selections of 20 (L2-031 AC1); an experience shared or edited, which may carry a picture, counts with them.</summary>
    public const string Photos = "photos";

    public static IServiceCollection AddPopkinRateLimits(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(CodesPerAddress, context => PerAddress(context, permits: 10));
            options.AddPolicy(InviteCodes, context => PerAddress(context, permits: 20));
            options.AddPolicy(Messages, PerPerson);
            options.AddPolicy(Photos, PerPerson);

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

    /// <summary>
    /// Counted by the person the session names, never by an address many people may share. A
    /// request without a session is not counted: authorization refuses it.
    /// </summary>
    private static RateLimitPartition<string> PerPerson(HttpContext context)
    {
        var personId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(personId))
        {
            return RateLimitPartition.GetNoLimiter("");
        }

        var clock = context.RequestServices.GetRequiredService<TimeProvider>();
        return RateLimitPartition.Get(personId, _ => new SlidingLogRateLimiter(permitLimit: 60, TimeSpan.FromMinutes(1), clock));
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
