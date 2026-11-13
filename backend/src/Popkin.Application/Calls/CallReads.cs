using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Calls;

/// <summary>What the call handlers read alike: the call under way and who is on a call.</summary>
internal static class CallReads
{
    /// <summary>The Popkin's group call under way, tracked, or null.</summary>
    public static Task<Call?> UnderWayAsync(IAppDbContext db, Guid popkinId, CancellationToken cancellationToken) =>
        db.Calls.FirstOrDefaultAsync(c => c.PopkinId == popkinId && c.EndedAt == null, cancellationToken);

    public static Task<int> CountOnAsync(IAppDbContext db, Guid callId, CancellationToken cancellationToken) =>
        db.CallParticipants.CountAsync(p => p.CallId == callId && p.LeftAt == null, cancellationToken);

    /// <summary>Everyone on the call, in the order they joined.</summary>
    public static async Task<List<CallParticipantDto>> ParticipantsAsync(
        IAppDbContext db, Guid callId, IPhotoStore photos, CancellationToken cancellationToken)
    {
        var participants = await db.CallParticipants.AsNoTracking()
            .Where(p => p.CallId == callId && p.LeftAt == null)
            .ToListAsync(cancellationToken);
        var membershipIds = participants.Select(p => p.MembershipId).ToList();
        var memberships = await db.Memberships.AsNoTracking()
            .Where(m => membershipIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, cancellationToken);
        return participants
            .OrderBy(p => p.JoinedAt)
            .ThenBy(p => p.Id)
            .Select(p => CallParticipantDto.Of(p, memberships[p.MembershipId], photos))
            .ToList();
    }
}
