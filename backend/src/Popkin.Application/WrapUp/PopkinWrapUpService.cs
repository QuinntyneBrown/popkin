using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Wraps a Popkin up, whether its Host chose to (L2-043) or its time is up (L2-044): the Popkin
/// and every call under way in it end in one unit of work, saved here, and the members with the
/// Popkin open are told after the commit.
/// </summary>
public sealed class PopkinWrapUpService(IAppDbContext db, TimeProvider clock, IPopkinNotifier notifier)
{
    /// <summary>
    /// Wraps up an active Popkin, tracked by this unit of work. Returns false, with nothing
    /// changed, when another wrap-up of the same Popkin was saved first.
    /// </summary>
    public async Task<bool> WrapUpAsync(PopkinSpace popkin, bool keepPhotos, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        // No call outlives its Popkin (L2-045 AC1): the one under way ends for everyone on it.
        var calls = await db.Calls.Where(c => c.PopkinId == popkin.Id && c.EndedAt == null).ToListAsync(cancellationToken);
        var callIds = calls.Select(c => c.Id).ToList();
        var participants = await db.CallParticipants
            .Where(p => callIds.Contains(p.CallId) && p.LeftAt == null)
            .ToListAsync(cancellationToken);
        popkin.WrapUp(now, keepPhotos);
        foreach (var call in calls)
        {
            call.End(participants.Where(p => p.CallId == call.Id), now);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Nothing of this attempt is saved later by the same unit of work.
            db.Popkins.Entry(popkin).State = EntityState.Detached;
            calls.ForEach(call => db.Calls.Entry(call).State = EntityState.Detached);
            participants.ForEach(participant => db.CallParticipants.Entry(participant).State = EntityState.Detached);
            var wrappedUp = await db.Popkins.AsNoTracking()
                .AnyAsync(p => p.Id == popkin.Id && p.Status == PopkinStatus.WrappedUp, CancellationToken.None);
            if (wrappedUp)
            {
                return false;
            }

            throw;
        }

        // Told after the commit: the call's end first, then the wrap-up, whose recovery read is
        // the Popkin itself (L2-044 AC4).
        foreach (var call in calls)
        {
            await notifier.CallEnded(popkin.Id, call.Id);
        }

        await notifier.PopkinWrappedUp(popkin.Id);
        return true;
    }
}
