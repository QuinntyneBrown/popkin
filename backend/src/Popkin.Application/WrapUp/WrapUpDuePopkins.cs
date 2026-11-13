using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Telemetry;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Wraps up every Popkin whose end date has passed, with its photo album kept (L2-044 AC1). A
/// Popkin with no end date never wraps up by itself (L2-044 AC3). The Worker sends it on each
/// tick of `WrapUpDuePopkinsJob`. Returns how many it wrapped up.
/// </summary>
public sealed record WrapUpDuePopkinsCommand : IRequest<int>;

public sealed class WrapUpDuePopkinsCommandHandler(
    IAppDbContext db, PopkinWrapUpService wrapUp, TimeProvider clock, PopkinMetrics metrics, ILogger<WrapUpDuePopkinsCommandHandler> logger)
    : IRequestHandler<WrapUpDuePopkinsCommand, int>
{
    /// <summary>How many Popkins are read at a time.</summary>
    public const int BatchSize = 100;

    /// <summary>A Popkin wraps up within a minute of its end date (L2-044 AC1).</summary>
    private static readonly TimeSpan Late = TimeSpan.FromMinutes(1);

    public async Task<int> Handle(WrapUpDuePopkinsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var wrappedUp = 0;
        var passedOver = new List<Guid>();
        // Once stopping is asked, no new batch is begun; the one in hand is finished.
        while (!cancellationToken.IsCancellationRequested)
        {
            var due = await db.Popkins
                .Where(p => p.Status == PopkinStatus.Active && p.EndsAt != null && p.EndsAt <= now)
                .Where(p => !passedOver.Contains(p.Id))
                .OrderBy(p => p.EndsAt)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);
            if (due.Count == 0)
            {
                break;
            }

            foreach (var popkin in due)
            {
                try
                {
                    // Each Popkin is saved alone, so one that fails holds back no other.
                    if (!await wrapUp.WrapUpAsync(popkin, keepPhotos: true, CancellationToken.None))
                    {
                        // Its Host wrapped it up in the same moment: the Host's choice stands.
                        passedOver.Add(popkin.Id);
                        continue;
                    }
                }
                catch (Exception exception)
                {
                    // The next tick tries it again.
                    logger.LogError(exception, "The Popkin {PopkinId} could not be wrapped up", popkin.Id);
                    passedOver.Add(popkin.Id);
                    continue;
                }

                wrappedUp++;
                var lateness = popkin.WrappedUpAt!.Value - popkin.EndsAt!.Value;
                metrics.WrappedUpLate(lateness);
                if (lateness > Late)
                {
                    logger.LogWarning(
                        "The Popkin {PopkinId} wrapped up {Lateness} s after its end date, over the minute of L2-044", popkin.Id, (long)lateness.TotalSeconds);
                }
            }
        }

        return wrappedUp;
    }
}
