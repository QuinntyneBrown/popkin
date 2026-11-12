using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Database:Provider chooses SqlServer (the default), Sqlite (the e2e API) or InMemory (tests only).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "SqlServer";
        var connectionString = configuration.GetConnectionString("Popkin");

        services.AddDbContext<AppDbContext>(options =>
        {
            switch (provider.ToLowerInvariant())
            {
                case "sqlserver":
                    options.UseSqlServer(connectionString);
                    break;
                case "sqlite":
                    options.UseSqlite(connectionString);
                    break;
                case "inmemory":
                    options.UseInMemoryDatabase(configuration["Database:Name"] ?? "popkin");
                    break;
                default:
                    throw new InvalidOperationException($"Database:Provider '{provider}' is not supported.");
            }
        });
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
