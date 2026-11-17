using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications;
using Popkin.Domain;

namespace Popkin.Application.Plan;

/// <summary>
/// The "Plan changes" event of a story's change (deliver-notifications): for the members, naming
/// the new owner when the change gives the story to someone else, with its before and after as
/// facts and never its title (popkin-update-email, "Plan facts").
/// </summary>
internal static class PlanNotifications
{
    public static async Task RecordAsync(
        IAppDbContext db, Story story, Membership actor, DateTimeOffset now, Guid? ownerFrom, object? facts, CancellationToken cancellationToken)
    {
        Guid? named = null;
        if (story.OwnerMembershipId is { } owner && owner != ownerFrom && owner != actor.Id)
        {
            named = await db.Memberships.AsNoTracking()
                .Where(m => m.Id == owner)
                .Select(m => (Guid?)m.PersonId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        db.ForMembers(NotificationKind.PlanChanges, story.PopkinId, actor.PersonId, story.Id, now, named, facts);
    }
}
