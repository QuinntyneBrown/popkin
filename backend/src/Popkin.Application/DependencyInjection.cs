using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Popkin.Application.Auth;
using Popkin.Application.Popkins;
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
        services.AddSingleton<PopkinMetrics>();
        services.AddSingleton(new InviteLinkBuilder(configuration?["Invites:BaseUrl"] ?? "https://popk.in/"));
        return services;
    }
}
