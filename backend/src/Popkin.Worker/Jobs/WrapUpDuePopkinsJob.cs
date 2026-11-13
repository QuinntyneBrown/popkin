using MediatR;
using Popkin.Application.Telemetry;
using Popkin.Application.WrapUp;

namespace Popkin.Worker.Jobs;

/// <summary>
/// Every 30 seconds, wraps up the Popkins whose time is up, so one wraps up within a minute of
/// its end date with a tick to spare (L2-044 AC1). After each tick it records when the tick
/// finished as `popkin.wrap_up.last_tick`: the Worker has no HTTP surface to probe, and a
/// Worker that stops ticking would otherwise fail silently (ADR 0012).
/// </summary>
public sealed class WrapUpDuePopkinsJob(IServiceScopeFactory scopes, TimeProvider clock, PopkinMetrics metrics, ILogger<WrapUpDuePopkinsJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromSeconds(30);

    private readonly TimeProvider _clock = clock;

    protected override IRequest<int> NewCommand() => new WrapUpDuePopkinsCommand();

    protected override void Ticked() => metrics.WrapUpTicked(_clock.GetUtcNow());
}
