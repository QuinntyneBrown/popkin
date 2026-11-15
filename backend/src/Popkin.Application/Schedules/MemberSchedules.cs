using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;

namespace Popkin.Application.Schedules;

/// <summary>
/// A member's schedule goes with them: leaving a Popkin (L2-047) or deleting the account (L2-049)
/// removes the member's time off and working hours, so nobody else sees them again.
/// </summary>
public static class MemberSchedules
{
    /// <summary>Marks the memberships' time off and working hours for removal; the caller saves.</summary>
    public static async Task RemoveAsync(IAppDbContext db, IReadOnlyCollection<Guid> membershipIds, CancellationToken cancellationToken)
    {
        var days = await db.TimeOffDays.Where(d => membershipIds.Contains(d.MembershipId)).ToListAsync(cancellationToken);
        db.TimeOffDays.RemoveRange(days);
        var stretches = await db.WorkingStretches.Where(s => membershipIds.Contains(s.MembershipId)).ToListAsync(cancellationToken);
        db.WorkingStretches.RemoveRange(stretches);
    }
}
