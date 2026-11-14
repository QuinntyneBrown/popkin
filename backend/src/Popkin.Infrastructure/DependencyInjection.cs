using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Azure.Communication.Email;
using Azure.Communication.Sms;
using Azure.Core;
using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Domain;
using Popkin.Application.Photos;
using Popkin.Infrastructure.Auth;
using Popkin.Infrastructure.Media;
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
        services.AddSingleton<IInviteCodeGenerator, RandomInviteCodeGenerator>();

        services.AddSingleton<IPhotoProcessor, MagickPhotoProcessor>();
        // Signs the addresses stored files are read from; like the code hash key, it must be
        // configured outside Development.
        var signingKey = configuration["Photos:SigningKey"];
        if (string.IsNullOrEmpty(signingKey) && !development)
        {
            throw new InvalidOperationException("Photos:SigningKey is not configured.");
        }

        var photoKey = SHA256.HashData(Encoding.UTF8.GetBytes(signingKey ?? "popkin-development-only-photo-key"));
        services.AddSingleton(sp => new PhotoUrlSigner(photoKey, sp.GetRequiredService<TimeProvider>()));
        // Azure Blob Storage keeps the photo files (ADR 0022), signed in to with the apps'
        // managed identity; in Development, without it, files stay on this machine.
        if (configuration["Photos:BlobEndpoint"] is { Length: > 0 } blobEndpoint)
        {
            TokenCredential credential = configuration["Photos:ClientId"] is { Length: > 0 } photosClientId
                ? new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(photosClientId))
                : new DefaultAzureCredential();
            var containerName = configuration["Photos:Container"] is { Length: > 0 } name ? name : "photos";
            var container = new BlobServiceClient(new Uri(blobEndpoint), credential).GetBlobContainerClient(containerName);
            services.AddSingleton<IPhotoStore>(sp => new BlobPhotoStore(container, sp.GetRequiredService<PhotoUrlSigner>()));
        }
        else if (development)
        {
            var root = configuration["Photos:Root"] ?? Path.Combine(Path.GetTempPath(), "popkin-photos");
            services.AddSingleton<IPhotoStore>(sp => new LocalPhotoStore(root, sp.GetRequiredService<PhotoUrlSigner>()));
        }
        else
        {
            services.AddSingleton<IPhotoStore, UnconfiguredPhotoStore>();
        }

        // The media relay provider is `<TO SUPPLY>`; any relay that takes the shared-secret scheme fits.
        var relayUrls = configuration.GetSection("MediaRelay:Urls").GetChildren()
            .Select(url => url.Value)
            .OfType<string>()
            .Where(url => url.Length > 0)
            .ToList();
        var relayLifetime = TurnCredentialIssuer.DefaultLifetime;
        if (configuration["MediaRelay:CredentialLifetime"] is { Length: > 0 } configuredLifetime
            && (!TimeSpan.TryParse(configuredLifetime, CultureInfo.InvariantCulture, out relayLifetime) || relayLifetime <= TimeSpan.Zero))
        {
            throw new InvalidOperationException("MediaRelay:CredentialLifetime is not a length of time, such as 01:00:00.");
        }

        services.AddSingleton<IMediaRelayCredentials>(sp => new TurnCredentialIssuer(
            relayUrls, configuration["MediaRelay:Secret"], relayLifetime, sp.GetRequiredService<TimeProvider>()));

        // Azure Communication Services sends codes and crew invites (ADR 0021). A channel is on
        // when the endpoint and its sender are set; otherwise it falls back below.
        var communicationEndpoint = configuration["Communication:Endpoint"];
        var emailSender = configuration["Communication:EmailSender"];
        var smsSender = configuration["Communication:SmsSender"];
        TokenCredential? communicationCredential = null;
        if (communicationEndpoint is { Length: > 0 })
        {
            communicationCredential = configuration["Communication:ClientId"] is { Length: > 0 } clientId
                ? new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(clientId))
                : new DefaultAzureCredential();
        }

        foreach (var channel in Enum.GetValues<ContactChannel>())
        {
            var sender = channel == ContactChannel.Email ? emailSender : smsSender;
            if (communicationCredential is not null && sender is { Length: > 0 })
            {
                var endpoint = new Uri(communicationEndpoint!);
                if (channel == ContactChannel.Email)
                {
                    var client = new EmailClient(endpoint, communicationCredential);
                    services.AddSingleton<ICodeSender>(new EmailCodeSender(client, sender));
                    services.AddSingleton<ICrewInviteSender>(new EmailCrewInviteSender(client, sender));
                }
                else
                {
                    var client = new SmsClient(endpoint, communicationCredential);
                    services.AddSingleton<ICodeSender>(new SmsCodeSender(client, sender));
                    services.AddSingleton<ICrewInviteSender>(new SmsCrewInviteSender(client, sender));
                }
            }
            else if (development)
            {
                services.AddSingleton<ICodeSender>(sp => new DevelopmentCodeSender(channel, sp.GetRequiredService<ILogger<DevelopmentCodeSender>>()));
                services.AddSingleton<ICrewInviteSender>(
                    sp => new DevelopmentCrewInviteSender(channel, sp.GetRequiredService<ILogger<DevelopmentCrewInviteSender>>()));
            }
            else
            {
                services.AddSingleton<ICodeSender>(new UnconfiguredCodeSender(channel));
                services.AddSingleton<ICrewInviteSender>(new UnconfiguredCrewInviteSender(channel));
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
