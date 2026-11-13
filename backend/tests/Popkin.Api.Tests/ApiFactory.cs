using System.Net;
using System.Runtime.CompilerServices;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Popkin.Application.Abstractions;
using Popkin.Application.Realtime;
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
    private readonly ConditionalWeakTable<HttpClient, CookieContainer> _cookies = [];
    private int _hubConnections;

    /// <summary>
    /// Starts at the real time, to the second, because the client's cookie jar expires cookies by
    /// the real clock.
    /// </summary>
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds()));

    public CapturingCodeSender Codes { get; } = new();

    public FixedCodeGenerator CodeGenerator { get; } = new();

    public DatabaseFaults Faults { get; } = new();

    /// <summary>The requests the API has finished handling, to await what it does on its own time.</summary>
    public HandledRequests Requests { get; } = new();

    /// <summary>Settings a test gives the API, set before its first request.</summary>
    public Dictionary<string, string?> Settings { get; } = [];

    /// <summary>The photo store of this fixture, in memory.</summary>
    public InMemoryPhotoStore Photos => Services.GetRequiredService<InMemoryPhotoStore>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", _databaseName);
        builder.UseSetting("App:Origin", "https://localhost");
        builder.UseSetting("Invites:BaseUrl", "https://popk.in/");
        foreach (var (key, value) in Settings)
        {
            builder.UseSetting(key, value);
        }

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
            services.AddSingleton(Requests);
            services.AddTransient(typeof(IPipelineBehavior<,>), typeof(HandledRequests.Behavior<,>));
            services.RemoveAll<ICodeSender>();
            services.AddSingleton<ICodeSender>(Codes.For(Domain.ContactChannel.Phone));
            services.AddSingleton<ICodeSender>(Codes.For(Domain.ContactChannel.Email));
        });
    }

    /// <summary>A client on HTTPS that sends what a same-origin browser request sends.</summary>
    public HttpClient CreateBrowserClient()
    {
        // The cookie jar is kept, so a hub connection can carry the same session (ADR 0010).
        var cookies = new CookieContainer();
        var client = CreateDefaultClient(new Uri("https://localhost"), new RedirectHandler(), new CookieContainerHandler(cookies));
        client.DefaultRequestHeaders.Add("Sec-Fetch-Site", "same-origin");
        _cookies.Add(client, cookies);
        return client;
    }

    /// <summary>
    /// Connects a real SignalR client to `PopkinHub` through the test server's handler, as the
    /// browser of `client` would: with its session cookie and `Sec-Fetch-Site: same-origin`
    /// (ADR 0010). Long polling, because the test server has no WebSocket listener. It throws
    /// when the hub refuses the connection.
    /// </summary>
    public async Task<HubEvents> CreateHubConnectionAsync(HttpClient client, string site = "same-origin")
    {
        if (!_cookies.TryGetValue(client, out var cookies))
        {
            throw new ArgumentException("The client must come from CreateBrowserClient.", nameof(client));
        }

        var connection = new HubConnectionBuilder()
            .WithUrl("https://localhost/hubs/popkin", options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => new CookieContainerHandler(cookies) { InnerHandler = Server.CreateHandler() };
                options.Headers["Sec-Fetch-Site"] = site;
            })
            .Build();
        var events = new HubEvents(connection);
        try
        {
            await connection.StartAsync();
        }
        catch
        {
            await events.DisposeAsync();
            throw;
        }

        // A SignalR client is started as soon as the handshake is answered, which is before the
        // hub has put the connection in its Popkins' groups. A test goes on only once it has.
        await Requests.WaitForAsync<ConnectToHubCommand>(Interlocked.Increment(ref _hubConnections));
        return events;
    }
}
