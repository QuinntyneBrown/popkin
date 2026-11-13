using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Domain;

namespace Popkin.Application.Calls;

/// <summary>What the call handlers read alike: the call under way and who is on a call.</summary>
internal static class CallReads
{
    /// <summary>
    /// The call under way, tracked, or null: the Popkin's group call, or with a thread the
    /// direct call of that direct message.
    /// </summary>
    public static Task<Call?> UnderWayAsync(IAppDbContext db, Guid popkinId, Guid? threadId, CancellationToken cancellationToken) =>
        db.Calls.FirstOrDefaultAsync(c => c.PopkinId == popkinId && c.ThreadId == threadId && c.EndedAt == null, cancellationToken);

    /// <summary>
    /// The thread a call is asked for, as the call stores it: null for the group call, and for
    /// Everyone, whose call is the group call; a direct message only its two members may name,
    /// and anyone else gets 404 `thread_not_found`, as for a thread that does not exist (L2-023 AC2).
    /// </summary>
    public static async Task<Guid?> CallThreadIdAsync(IAppDbContext db, Membership membership, Guid? threadId, CancellationToken cancellationToken)
    {
        if (threadId is not { } id)
        {
            return null;
        }

        var thread = await ChatThreads.RequireAsync(db, membership, id, cancellationToken);
        return thread.Kind == ChatThreadKind.Direct ? thread.Id : null;
    }

    /// <summary>Who is told how many are on a call: the Popkin for its group call, the two members for a direct call.</summary>
    public static async Task<Audience> AudienceAsync(IAppDbContext db, Call call, CancellationToken cancellationToken)
    {
        if (call.ThreadId is not { } threadId)
        {
            return Audience.Popkin(call.PopkinId);
        }

        var thread = await db.ChatThreads.AsNoTracking().FirstAsync(t => t.Id == threadId, cancellationToken);
        return await ChatThreads.AudienceAsync(db, thread, cancellationToken);
    }

    public static Task<int> CountOnAsync(IAppDbContext db, Guid callId, CancellationToken cancellationToken) =>
        db.CallParticipants.CountAsync(p => p.CallId == callId && p.LeftAt == null, cancellationToken);

    /// <summary>The id of the member's participant on that call of that Popkin, or null when they are not on it.</summary>
    public static async Task<Guid?> ParticipantIdAsync(
        IAppDbContext db, Guid popkinId, Guid callId, Guid membershipId, CancellationToken cancellationToken)
    {
        var ids = await db.CallParticipants.AsNoTracking()
            .Where(p => p.CallId == callId && p.MembershipId == membershipId && p.LeftAt == null)
            .Where(p => db.Calls.Any(c => c.Id == p.CallId && c.PopkinId == popkinId))
            .Select(p => p.Id)
            .ToListAsync(cancellationToken);
        return ids.Count == 0 ? null : ids[0];
    }

    /// <summary>
    /// The person's participant on that call, tracked, or null when they are not on it. For the
    /// hub, where the person comes from the connection and no Popkin is named.
    /// </summary>
    public static Task<CallParticipant?> OnCallAsync(IAppDbContext db, Guid personId, Guid callId, CancellationToken cancellationToken) =>
        db.CallParticipants.FirstOrDefaultAsync(
            p => p.CallId == callId
                && p.LeftAt == null
                && db.Memberships.Any(m => m.Id == p.MembershipId && m.PersonId == personId && m.LeftAt == null),
            cancellationToken);

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
