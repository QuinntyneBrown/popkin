using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Wraps a Popkin up, whether its Host chose to (L2-043) or its time is up (L2-044): one unit of
/// work, saved here.
/// </summary>
public sealed class PopkinWrapUpService(IAppDbContext db, TimeProvider clock)
{
    /// <summary>Wraps up an active Popkin, tracked by this unit of work, and saves it.</summary>
    public async Task WrapUpAsync(PopkinSpace popkin, bool keepPhotos, CancellationToken cancellationToken)
    {
        popkin.WrapUp(clock.GetUtcNow(), keepPhotos);
        await db.SaveChangesAsync(cancellationToken);
    }
}
