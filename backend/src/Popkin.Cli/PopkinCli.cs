using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Cli;

/// <summary>
/// The `popkin` command-line tool. The API never migrates on startup; run `popkin migrate`.
/// Configuration comes from appsettings.json, environment variables (`Database__Provider`,
/// `ConnectionStrings__Popkin`) and `--Key=value` arguments.
/// </summary>
public static class PopkinCli
{
    private static readonly string[] Commands = ["migrate", "seed", "reset"];

    public static async Task<int> RunAsync(string[] args, TextWriter output)
    {
        var command = args.FirstOrDefault(a => !a.StartsWith("--", StringComparison.Ordinal));
        if (command is null)
        {
            await output.WriteLineAsync("Usage: popkin <command> [--Key=value ...]");
            await output.WriteLineAsync("  migrate  Brings the database schema up to date.");
            await output.WriteLineAsync("  seed     Adds the starting data; safe to re-run.");
            await output.WriteLineAsync("  reset    Deletes the database, migrates it and seeds it.");
            return 0;
        }

        if (!Commands.Contains(command))
        {
            await output.WriteLineAsync($"Unknown command '{command}'.");
            return 1;
        }

        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .AddCommandLine(args.Where(a => a.StartsWith("--", StringComparison.Ordinal)).ToArray())
            .Build();
        var services = new ServiceCollection().AddPopkinDatabase(configuration).BuildServiceProvider();
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        switch (command)
        {
            case "migrate":
                await MigrateAsync(db);
                await output.WriteLineAsync("The database is up to date.");
                break;
            case "seed":
                await MigrateAsync(db);
                await Seeder.SeedAsync(db, TimeProvider.System);
                await output.WriteLineAsync("The seed data is in place.");
                break;
            case "reset":
                await db.Database.EnsureDeletedAsync();
                await MigrateAsync(db);
                await Seeder.SeedAsync(db, TimeProvider.System);
                await output.WriteLineAsync("The database was reset and seeded.");
                break;
        }

        return 0;
    }

    /// <summary>SQL Server applies the migrations; SQLite and InMemory build the schema from the model (ADR 0001).</summary>
    private static async Task MigrateAsync(AppDbContext db)
    {
        if (db.Database.IsSqlServer())
        {
            await db.Database.MigrateAsync();
        }
        else
        {
            await db.Database.EnsureCreatedAsync();
        }
    }
}
