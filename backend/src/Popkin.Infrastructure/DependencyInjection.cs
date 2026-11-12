using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Infrastructure.Auth;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Database:Provider chooses SqlServer (the default), Sqlite (the e2e API) or InMemory (tests only).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration, IHostEnvironment? environment = null)
    {
        services.AddPopkinDatabase(configuration);
        services.AddSingleton(TimeProvider.System);

        var development = environment?.IsDevelopment() ?? false;
        var developmentCode = configuration["Auth:DevelopmentCode"];
        if (development && !string.IsNullOrEmpty(developmentCode))
        {
            services.AddSingleton<ICodeGenerator>(new DevelopmentCodeGenerator(developmentCode));
        }
        else
        {
            services.AddSingleton<ICodeGenerator, RandomCodeGenerator>();
        }

        // The key storage is `<TO SUPPLY>`; outside Development the key must be configured.
        var hashKey = configuration["Auth:CodeHashKey"];
        if (string.IsNullOrEmpty(hashKey) && !development)
        {
            throw new InvalidOperationException("Auth:CodeHashKey is not configured.");
        }

        var key = SHA256.HashData(Encoding.UTF8.GetBytes(hashKey ?? "popkin-development-only-key"));
        services.AddSingleton<ICodeHasher>(new HmacCodeHasher(key));

        foreach (var channel in Enum.GetValues<ContactChannel>())
        {
            if (development)
            {
                services.AddSingleton<ICodeSender>(sp => new DevelopmentCodeSender(channel, sp.GetRequiredService<ILogger<DevelopmentCodeSender>>()));
            }
            else
            {
                services.AddSingleton<ICodeSender>(new UnconfiguredCodeSender(channel));
            }
        }

        return services;
    }

    public static IServiceCollection AddPopkinDatabase(this IServiceCollection services, IConfiguration configuration)
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
        return services;
    }
}
