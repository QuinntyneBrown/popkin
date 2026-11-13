using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// How many messages of a thread are unread by one member, and where they have read to: the
/// messages of others after the member's read point, and all of them before the first read
/// (L2-027 AC3). Every count of unread messages comes from here.
/// </summary>
public sealed record ThreadUnread(int Count, Guid? LastReadMessageId)
{
    public static async Task<ThreadUnread> OfAsync(IAppDbContext db, Guid threadId, Guid membershipId, CancellationToken cancellationToken)
    {
        var read = await db.ThreadReadStates.AsNoTracking()
            .FirstOrDefaultAsync(s => s.ThreadId == threadId && s.MembershipId == membershipId, cancellationToken);
        var byOthers = db.Messages.Where(m => m.ThreadId == threadId && m.DeletedAt == null && m.AuthorMembershipId != membershipId);
        var count = await (read is null ? byOthers : byOthers.After(new MessagePoint(read.LastReadSentAt, read.LastReadMessageId)))
            .CountAsync(cancellationToken);
        return new ThreadUnread(count, read?.LastReadMessageId);
    }

    /// <summary>
    /// The same count for many threads of one person at once, in one query, by thread id; a
    /// thread with nothing unread is absent. `membershipIds` are that person's memberships, one
    /// per Popkin: a thread belongs to one Popkin, so in each thread exactly one of them is the
    /// reader, the author to leave out and the owner of the read point.
    /// </summary>
    public static async Task<IReadOnlyDictionary<Guid, int>> CountsAsync(
        IAppDbContext db, IReadOnlyCollection<Guid> threadIds, IReadOnlyCollection<Guid> membershipIds, CancellationToken cancellationToken)
    {
        var readPoints = db.ThreadReadStates.Where(s => membershipIds.Contains(s.MembershipId));
        var counts = await db.Messages
            .Where(m => threadIds.Contains(m.ThreadId) && m.DeletedAt == null && !membershipIds.Contains(m.AuthorMembershipId))
            // Unread is what lies after the read point, by time and then id: not at it or before it.
            .Where(m => !readPoints.Any(s => s.ThreadId == m.ThreadId
                && (m.SentAt < s.LastReadSentAt || (m.SentAt == s.LastReadSentAt && m.Id.CompareTo(s.LastReadMessageId) <= 0))))
            .GroupBy(m => m.ThreadId)
            .Select(g => new { ThreadId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);
        return counts.ToDictionary(c => c.ThreadId, c => c.Count);
    }
}
