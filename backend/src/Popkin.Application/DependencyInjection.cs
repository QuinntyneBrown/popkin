using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Popkin.Application.Auth;
using Popkin.Application.Calls;
using Popkin.Application.Popkins;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Application.Telemetry;

namespace Popkin.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration? configuration = null)
    {
        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<CodeIssuer>();
        services.AddScoped<IMembershipGuard, MembershipGuard>();
        services.AddScoped<CallLeaver>();
        services.AddSingleton<CallDisconnectGrace>();
        services.AddSingleton<PopkinMetrics>();
        // Who is here now is kept in this process: one API instance (ADR 0009).
        services.AddSingleton<PresenceTracker>();
        services.AddSingleton(new InviteLinkBuilder(configuration?["Invites:BaseUrl"] ?? "https://popk.in/"));
        return services;
    }
}
