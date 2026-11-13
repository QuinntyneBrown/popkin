using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Popkin.Application.Abstractions;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests;

/// <summary>
/// The API on the EF Core InMemory provider, one store per fixture (ADR 0005). The clock, the
/// code generator and the code senders are replaced so tests control time and read the codes.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"popkin-tests-{Guid.NewGuid():N}";

    /// <summary>
    /// Starts at the real time, to the second, because the client's cookie jar expires cookies by
    /// the real clock.
    /// </summary>
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds()));

    public CapturingCodeSender Codes { get; } = new();

    public FixedCodeGenerator CodeGenerator { get; } = new();

    public DatabaseFaults Faults { get; } = new();

    /// <summary>The photo store of this fixture, in memory.</summary>
    public InMemoryPhotoStore Photos => Services.GetRequiredService<InMemoryPhotoStore>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", _databaseName);
        builder.UseSetting("App:Origin", "https://localhost");
        builder.UseSetting("Invites:BaseUrl", "https://popk.in/");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<ICodeGenerator>();
            services.AddSingleton<ICodeGenerator>(CodeGenerator);
            services.RemoveAll<IAppDbContext>();
            services.AddScoped<IAppDbContext>(sp => new FaultyDbContext(sp.GetRequiredService<AppDbContext>(), Faults));
            services.RemoveAll<IPhotoStore>();
            services.AddSingleton<InMemoryPhotoStore>();
            services.AddSingleton<IPhotoStore>(sp => sp.GetRequiredService<InMemoryPhotoStore>());
            services.RemoveAll<ICodeSender>();
            services.AddSingleton<ICodeSender>(Codes.For(Domain.ContactChannel.Phone));
            services.AddSingleton<ICodeSender>(Codes.For(Domain.ContactChannel.Email));
        });
    }

    /// <summary>A client on HTTPS that sends what a same-origin browser request sends.</summary>
    public HttpClient CreateBrowserClient()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
        client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "same-origin");
        return client;
    }
}
