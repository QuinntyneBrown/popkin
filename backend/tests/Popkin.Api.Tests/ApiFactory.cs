using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Popkin.Api.Tests;

/// <summary>The API on the EF Core InMemory provider, one store per fixture (ADR 0005).</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"popkin-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", _databaseName);
    }
}
