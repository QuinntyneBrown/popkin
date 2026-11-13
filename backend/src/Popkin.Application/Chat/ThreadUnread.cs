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
}
