using Popkin.Domain;
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
        // Plan and Schedules are on for everyone locally, so the recording covers them (ADR 0024).
        Assert.Equal(FeatureMode.Everyone, Assert.Single(db.FeatureSettings, s => s.Feature == Feature.Schedules).Mode);
        Assert.Equal(FeatureMode.Everyone, Assert.Single(db.FeatureSettings, s => s.Feature == Feature.Plan).Mode);
    }

    // Gap 145: the holiday calendars come from the seed, each once, with its dates by rule and
    // its first estimates.
    [Fact]
    public async Task Seed_adds_the_holiday_calendars_once()
    {
        await Run(new StringWriter(), "migrate");

        await Run(new StringWriter(), "seed");
        await Run(new StringWriter(), "seed");

        await using var db = Open();
        Assert.Equal(
            ["United States", "United Kingdom", "Islamic holidays", "Hindu festivals", "Australia"],
            db.HolidayCalendars.OrderBy(c => c.CreatedAt).Select(c => c.Name).ToArray());
        var us = db.HolidayCalendars.Single(c => c.Key == "us").Id;
        var independence = db.Holidays.Single(h => h.CalendarId == us && h.Year == 2026 && h.Name == "Independence Day");
        Assert.Equal(new DateOnly(2026, 7, 4), independence.Date);
        Assert.Equal("Observed Fri 3 Jul", independence.Note);
        Assert.Equal(HolidayStatus.ByRule, independence.Status);
        var islamic = db.HolidayCalendars.Single(c => c.Key == "islamic").Id;
        Assert.Null(db.HolidayCalendarYears.Single(y => y.CalendarId == islamic && y.Year == 2027).PublishedAt);
        Assert.All(db.Holidays.Where(h => h.CalendarId == islamic && h.Year == 2027), h => Assert.Equal(HolidayStatus.Estimated, h.Status));
        var australia = db.HolidayCalendars.Single(c => c.Key == "australia").Id;
        Assert.DoesNotContain(db.HolidayCalendarYears, y => y.CalendarId == australia && y.PublishedAt != null);
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
