using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Wraps a Popkin up, whether its Host chose to (L2-043) or its time is up (L2-044): the Popkin
/// and every call under way in it, the group call and each direct call, end in one unit of work, saved here, and the members with the
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
        var (calls, participants) = await PrepareAsync(popkin, keepPhotos, cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Nothing of this attempt is saved later by the same unit of work.
            db.Popkins.Entry(popkin).State = EntityState.Detached;
            foreach (var call in calls)
            {
                db.Calls.Entry(call).State = EntityState.Detached;
            }

            foreach (var participant in participants)
            {
                db.CallParticipants.Entry(participant).State = EntityState.Detached;
            }

            var wrappedUp = await db.Popkins.AsNoTracking()
                .AnyAsync(p => p.Id == popkin.Id && p.Status == PopkinStatus.WrappedUp, CancellationToken.None);
            if (wrappedUp)
            {
                return false;
            }

            throw;
        }

        await AnnounceAsync(popkin, calls);
        return true;
    }

    /// <summary>
    /// Wraps up an active Popkin tracked by the caller's unit of work, and ends every call under
    /// way in it (L2-045 AC1), without saving: the caller saves it with the rest of its work,
    /// then calls <see cref="AnnounceAsync"/>. Returns the calls it ended and who was on them.
    /// </summary>
    public async Task<PreparedWrapUp> PrepareAsync(PopkinSpace popkin, bool keepPhotos, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
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

        return new PreparedWrapUp(calls, participants);
    }

            throw;
        }

        // Told after the commit: the call's end first, then the wrap-up, whose recovery read is
        // the Popkin itself (L2-044 AC4).
        // A direct call's end goes to its two members only (L2-023 AC2).
        foreach (var call in calls)
        {
            await notifier.CallEnded(await CallReads.AudienceAsync(db, call, CancellationToken.None), call.Id, call.ThreadId);
        }

        await notifier.PopkinWrappedUp(popkin.Id);
    }
}

/// <summary>What a wrap-up changed beside the Popkin: the calls it ended and their participants.</summary>
public sealed record PreparedWrapUp(IReadOnlyList<Call> Calls, IReadOnlyList<CallParticipant> Participants);
