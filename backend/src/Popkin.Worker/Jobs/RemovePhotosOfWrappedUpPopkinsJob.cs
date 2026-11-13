using MediatR;
using Popkin.Application.WrapUp;

namespace Popkin.Worker.Jobs;

/// <summary>
/// Every hour, removes the photos of the Popkins that wrapped up without their album 30 days
/// ago or more (L2-045 AC4). An hour is close enough for a rule of 30 days.
/// </summary>
public sealed class RemovePhotosOfWrappedUpPopkinsJob(IServiceScopeFactory scopes, TimeProvider clock, ILogger<RemovePhotosOfWrappedUpPopkinsJob> logger)
    : PeriodicJob<int>(Period, scopes, clock, logger)
{
    public static readonly TimeSpan Period = TimeSpan.FromHours(1);

    protected override IRequest<int> NewCommand() => new RemoveWrappedUpAlbumsCommand();
}
