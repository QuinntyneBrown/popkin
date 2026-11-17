using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Popkin.Application.Abstractions;
using Popkin.Application.Auth;

namespace Popkin.Api.Auth;

/// <summary>Issues and clears the session cookie, `__Host-popkin` (docs/detailed-designs/accounts/sessions).</summary>
public static class SessionCookie
{
    public const string Name = "__Host-popkin";
    public const string SessionClaim = "pk:sid";

    public static IServiceCollection AddPopkinSessions(this IServiceCollection services)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                // L2-007 AC4: scripts cannot read it, it goes only over HTTPS, and never with
                // requests from other sites. SameSite=Strict replaces the scaffold's Lax.
                options.Cookie.Name = Name;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Strict;
                options.Cookie.Path = "/";
                // Each ticket carries its session's expiry; this is only the handler's fallback.
                options.ExpireTimeSpan = TimeSpan.FromDays(Domain.LimitDefaults.Of(Domain.LimitKey.SessionDays));
                options.SlidingExpiration = false;
                options.EventsType = typeof(SessionCookieEvents);
            });
        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<TimeProvider>((options, clock) => options.TimeProvider = clock);
        services.AddScoped<SessionCookieEvents>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentPerson, HttpCurrentPerson>();
        return services;
    }

    public static Task SignInAsync(HttpContext http, StartedSession session)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, session.PersonId.ToString()),
                new Claim(SessionClaim, session.SessionId.ToString()),
            ],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return http.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = session.ExpiresAt, AllowRefresh = false });
    }

    public static Task SignOutAsync(HttpContext http) => http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
}

/// <summary>
/// Checks the server-side session on every request, so a revoked session stops at once
/// (L2-050 AC3), renews the cookie when the session was renewed (L2-176 AC2), and answers 401/403
/// instead of redirecting.
/// </summary>
public sealed class SessionCookieEvents(ISender sender, TimeProvider clock) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var use = Guid.TryParse(principal?.FindFirstValue(SessionCookie.SessionClaim), out var sessionId)
            && Guid.TryParse(principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var personId)
                ? await sender.Send(new UseSessionCommand(sessionId, personId), context.HttpContext.RequestAborted)
                : SessionUse.Ended;
        if (!use.Live)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return;
        }

        if (use.RenewedUntil is { } renewedUntil)
        {
            // The handler re-issues the ticket for IssuedUtc..ExpiresUtc from now, so the fresh
            // cookie expires with the renewed session (L2-176 AC2).
            context.Properties.IssuedUtc = clock.GetUtcNow();
            context.Properties.ExpiresUtc = renewedUntil;
            context.ShouldRenew = true;
        }
    }

    public override Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}

public sealed class HttpCurrentPerson(IHttpContextAccessor accessor) : ICurrentPerson
{
    public Guid PersonId => Guid.Parse(Read(ClaimTypes.NameIdentifier));

    public Guid SessionId => Guid.Parse(Read(SessionCookie.SessionClaim));

    public Guid? FindPersonId() =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string Read(string type) =>
        accessor.HttpContext?.User.FindFirstValue(type) ?? throw new InvalidOperationException("No signed-in person.");
}
