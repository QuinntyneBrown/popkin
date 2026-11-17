using MediatR;
using Popkin.Application.Notifications.Digests;
using Popkin.Application.Telemetry;

namespace Popkin.Worker.Jobs;

/// <summary>
/// Every 5 minutes, gathers the digests due at 6 pm where each person is (L2-165). After each tick
/// it records `popkin.notifications.digests.last_tick`, so a stopped job is seen (ADR 0012).
/// </summary>
public sealed class SendDigestsJob(IServiceScopeFactory scopes, TimeProvider clock, PopkinMetrics metrics, ILogger<SendDigestsJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromMinutes(5);

    private readonly TimeProvider _clock = clock;

    protected override IRequest<int> NewCommand() => new SendDigestsCommand();

    protected override void Ticked() => metrics.DigestsTicked(_clock.GetUtcNow());
}
