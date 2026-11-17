using MediatR;
using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Worker.Jobs;

/// <summary>Once a day, removes notification history 90 days old (deliver-notifications).</summary>
public sealed class PurgeNotificationHistoryJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<PurgeNotificationHistoryJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromDays(1);

    protected override IRequest<int> NewCommand() => new PurgeNotificationHistoryCommand();
}
