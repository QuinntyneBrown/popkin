using MediatR;
using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Worker.Jobs;

/// <summary>Every 15 seconds, fans out new notification events and sends what is due (L2-161, L2-175).</summary>
public sealed class DispatchNotificationsJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<DispatchNotificationsJob> logger)
    : PeriodicJob<DispatchResult>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromSeconds(15);

    protected override IRequest<DispatchResult> NewCommand() => new DispatchNotificationsCommand();
}
