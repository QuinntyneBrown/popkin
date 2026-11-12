using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Auth;

namespace Popkin.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddScoped<CodeIssuer>();
        return services;
    }
}
