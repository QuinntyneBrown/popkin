using Popkin.Application;
using Popkin.Application.Abstractions;
using Popkin.Infrastructure;
using Popkin.Worker.Jobs;

namespace Popkin.Worker;

public static class WorkerHost
{
    /// <summary>Everything the Worker runs: the handlers, the stores, and the jobs that send them commands.</summary>
    public static IServiceCollection AddWorker(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddApplication(configuration);
        services.AddInfrastructure(configuration, environment);
        // What the API gives the handlers and the Worker has none of: a hub, a signed-in person and
        // a signed-in admin.
        services.AddSingleton<IPopkinNotifier, SilentPopkinNotifier>();
        services.AddSingleton<IPopkinConnections, NoPopkinConnections>();
        services.AddScoped<ICurrentPerson, NoCurrentPerson>();
        services.AddScoped<ICurrentAdmin, NoCurrentAdmin>();

        // Each job is the loop alone; its command's handler holds the rules.
        services.AddHostedService<WrapUpDuePopkinsJob>();
        services.AddHostedService<RemovePhotosOfWrappedUpPopkinsJob>();
        services.AddHostedService<PrepareAlbumExportsJob>();
        services.AddHostedService<PurgeDeletedAccountsJob>();
        services.AddHostedService<PurgeOldAuditEntriesJob>();
        services.AddHostedService<SendContactRemindersJob>();
        services.AddHostedService<DispatchNotificationsJob>();
        services.AddHostedService<SendPopkinRemindersJob>();
        return services;
    }
}
