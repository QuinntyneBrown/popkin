// Traces to: ADR 0015, L2-140 (the reminders job), docs/detailed-designs/admin-operations/jobs
// Description: The Worker's services all resolve, as Development checks them at start: a handler the Worker never sends still needs everything it asks for.
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Popkin.Worker.Tests;

public sealed class WorkerHostTests
{
    // Given the Worker's services in Development, when they are built with every registration
    // checked, then nothing is missing, so the Worker starts on a developer's machine.
    [Fact]
    public void The_Worker_starts_in_Development()
    {
        var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { EnvironmentName = Environments.Development });
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = "InMemory",
            ["Photos:SigningKey"] = "worker-host-test-signing-key-0123456789",
            ["Auth:CodeHashKey"] = "worker-host-test-code-hash-key-0123456789",
            ["Features:Contacts"] = "true",
        });

        builder.Services.AddWorker(builder.Configuration, builder.Environment);

        using var services = builder.Services.BuildServiceProvider(new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true });
        Assert.NotEmpty(services.GetServices<IHostedService>());
    }
}
