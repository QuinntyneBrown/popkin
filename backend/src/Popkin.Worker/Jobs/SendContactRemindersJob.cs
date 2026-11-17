using MediatR;
using Popkin.Application.Contacts.Reminders;
using Popkin.Application.Telemetry;

namespace Popkin.Worker.Jobs;

/// <summary>Every 5 minutes, adds and sends the Contacts reminders that are due (L2-140).</summary>
public sealed class SendContactRemindersJob(IServiceScopeFactory scopes, TimeProvider clock, PopkinMetrics metrics, ILogger<SendContactRemindersJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromMinutes(5);

    private readonly TimeProvider _clock = clock;

    protected override IRequest<int> NewCommand() => new SendContactRemindersCommand();

    /// <summary>The heartbeat of the reminder jobs (send-reminders, ADR 0012).</summary>
    protected override void Ticked() => metrics.RemindersTicked("contacts", _clock.GetUtcNow());
}
