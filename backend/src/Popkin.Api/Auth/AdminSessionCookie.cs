using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Abstractions;
using Popkin.Application.Administration.Auth;

namespace Popkin.Api.Auth;

/// <summary>
/// The admin app's own cookie, `__Host-popkin-admin`, beside the Popkin app's (L2-078 AC5,
/// ADR 0024). Host-only, so it is never sent to the Popkin app or to a Popkin's address. Its
/// scheme is never the default: every admin endpoint names it.
/// </summary>
public static class AdminSessionCookie
{
    public const string Scheme = "Admin";
    public const string Name = "__Host-popkin-admin";
    public const string AdminClaim = "pk:aid";
    public const string SessionClaim = "pk:asid";

    public static IServiceCollection AddAdminSessions(this IServiceCollection services)
    {
        services
            .AddAuthentication()
            .AddCookie(Scheme, options =>
            {
                options.Cookie.Name = Name;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Strict;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = Domain.AdminSession.Lifetime;
                options.SlidingExpiration = false;
                options.EventsType = typeof(AdminSessionCookieEvents);
            });
        services.AddOptions<CookieAuthenticationOptions>(Scheme)
            .Configure<TimeProvider>((options, clock) => options.TimeProvider = clock);
        services.AddScoped<AdminSessionCookieEvents>();
        services.AddScoped<ICurrentAdmin, HttpCurrentAdmin>();
        return services;
    }

    public static Task SignInAsync(HttpContext http, StartedAdminSession session)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(AdminClaim, session.AdminId.ToString()),
                new Claim(SessionClaim, session.SessionId.ToString()),
            ],
            Scheme);
        return http.SignInAsync(
            Scheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = session.ExpiresAt, AllowRefresh = false });
    }

    public static Task SignOutAsync(HttpContext http) => http.SignOutAsync(Scheme);
}

/// <summary>
/// Checks the admin session on every request, so a revoked session or a removed admin stops at
/// once (L2-078 AC7). Without an admin session it answers 401, or 403 `admin_session_required`
/// when the request carries a Popkin app session only (L2-078 AC3).
/// </summary>
public sealed class AdminSessionCookieEvents(ISender sender) : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var live = Guid.TryParse(principal?.FindFirstValue(AdminSessionCookie.SessionClaim), out var sessionId)
            && Guid.TryParse(principal?.FindFirstValue(AdminSessionCookie.AdminClaim), out var adminId)
            && await sender.Send(new ValidateAdminSessionCommand(sessionId, adminId), context.HttpContext.RequestAborted);
        if (!live)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(AdminSessionCookie.Scheme);
        }
    }

    public override async Task RedirectToLogin(RedirectContext<CookieAuthenticationOptions> context)
    {
        var popkinApp = await context.HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        if (!popkinApp.Succeeded)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        var details = new ProblemDetails { Status = 403, Title = "Sign in to the admin app." };
        details.Extensions["code"] = "admin_session_required";
        await context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>()
            .WriteAsync(new ProblemDetailsContext { HttpContext = context.HttpContext, ProblemDetails = details });
    }

    public override Task RedirectToAccessDenied(RedirectContext<CookieAuthenticationOptions> context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    }
}

public sealed class HttpCurrentAdmin(IHttpContextAccessor accessor) : ICurrentAdmin
{
    public Guid AdminId => Guid.Parse(Read(AdminSessionCookie.AdminClaim));

    public Guid SessionId => Guid.Parse(Read(AdminSessionCookie.SessionClaim));

    private string Read(string type) =>
        accessor.HttpContext?.User.FindFirstValue(type) ?? throw new InvalidOperationException("No signed-in admin.");
}

/// <summary>Adds the first Owner named by `Admin:FirstOwner` when the API starts (L2-119 AC9).</summary>
public sealed class AdminBootstrapper(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<AdminBootstrapper> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopes.CreateScope();
            await scope.ServiceProvider.GetRequiredService<ISender>()
                .Send(new EnsureFirstOwnerCommand(configuration["Admin:FirstOwner"]), cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // A database that is not migrated yet must not stop the API; the next start adds them.
            logger.LogError(exception, "The first Owner could not be added.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
