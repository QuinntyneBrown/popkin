using MediatR;
using Popkin.Application.Notifications.Reminders;
using Popkin.Application.Telemetry;

namespace Popkin.Worker.Jobs;

/// <summary>Every 5 minutes, records the Popkin reminders that are due: stories due tomorrow and Popkins wrapping up (L2-162, L2-167).</summary>
public sealed class SendPopkinRemindersJob(IServiceScopeFactory scopes, TimeProvider clock, PopkinMetrics metrics, ILogger<SendPopkinRemindersJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromMinutes(5);

    private readonly TimeProvider _clock = clock;

    protected override IRequest<int> NewCommand() => new SendPopkinRemindersCommand();

    /// <summary>The heartbeat of the reminder jobs (send-reminders, ADR 0012).</summary>
    protected override void Ticked() => metrics.RemindersTicked("popkins", _clock.GetUtcNow());
}
