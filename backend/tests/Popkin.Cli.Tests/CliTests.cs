using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Cli.Tests;

/// <summary>The `popkin` tool on the InMemory provider, one store per test (ADR 0005).</summary>
public sealed class CliTests
{
    private readonly string _store = $"popkin-cli-{Guid.NewGuid():N}";

    private Task<int> Run(StringWriter output, params string[] command) =>
        PopkinCli.RunAsync([.. command, "--Database:Provider=InMemory", $"--Database:Name={_store}"], output);

    private AppDbContext Open()
    {
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_store));
        return services.BuildServiceProvider().GetRequiredService<AppDbContext>();
    }

    [Fact]
    public async Task Without_a_command_it_lists_the_commands()
    {
        var output = new StringWriter();

        var exit = await PopkinCli.RunAsync([], output);

        Assert.Equal(0, exit);
        Assert.Contains("migrate", output.ToString());
        Assert.Contains("seed", output.ToString());
        Assert.Contains("reset", output.ToString());
    }

    [Fact]
    public async Task An_unknown_command_fails()
    {
        var output = new StringWriter();

        var exit = await Run(output, "frobnicate");

        Assert.Equal(1, exit);
        Assert.Contains("Unknown command 'frobnicate'", output.ToString());
    }

    [Fact]
    public async Task Migrate_prepares_the_database()
    {
        var output = new StringWriter();

        var exit = await Run(output, "migrate");

        Assert.Equal(0, exit);
        Assert.Contains("up to date", output.ToString());
    }

    [Fact]
    public async Task Seed_can_run_twice_and_adds_its_data_once()
    {
        await Run(new StringWriter(), "migrate");

        Assert.Equal(0, await Run(new StringWriter(), "seed"));
        Assert.Equal(0, await Run(new StringWriter(), "seed"));

        await using var db = Open();
        Assert.Single(db.People, p => p.Name == "Mara Okafor");
    }

    [Fact]
    public async Task Reset_starts_again_from_the_seed()
    {
        await Run(new StringWriter(), "seed");
        await using (var db = Open())
        {
            db.People.Add(Popkin.Domain.Person.Create("Extra", Popkin.Domain.ContactChannel.Email, "extra@example.com", DateTimeOffset.UtcNow));
            await db.SaveChangesAsync();
        }

        var exit = await Run(new StringWriter(), "reset");

        Assert.Equal(0, exit);
        await using var after = Open();
        Assert.Equal(["Mara Okafor"], after.People.Select(p => p.Name).ToArray());
    }
}
