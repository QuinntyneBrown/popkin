using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Popkin.Application.Abstractions;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests;

/// <summary>
/// The API on the EF Core InMemory provider, one store per fixture (ADR 0005). The clock, the
/// code generator and the code senders are replaced so tests control time and read the codes.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"popkin-tests-{Guid.NewGuid():N}";

    /// <summary>Saturday 12 September 2026, noon UTC: the day the mocks show.</summary>
    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 9, 12, 12, 0, 0, TimeSpan.Zero));

    public CapturingCodeSender Codes { get; } = new();

    public FixedCodeGenerator CodeGenerator { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", _databaseName);
        builder.UseSetting("App:Origin", "https://localhost");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<ICodeGenerator>();
            services.AddSingleton<ICodeGenerator>(CodeGenerator);
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
