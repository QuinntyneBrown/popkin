using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>The direct messages a member has, as the Chat tab and every unread count read them.</summary>
public static class DirectThreads
{
    /// <summary>
    /// The direct messages of these memberships whose other member has not left the Popkin:
    /// the ones the Chat tab can open, since a member who has left cannot be messaged (L2-023 AC4).
    /// A direct message opened and never written in is among them; the Chat tab leaves it out.
    /// </summary>
    public static IQueryable<ChatThread> Of(IAppDbContext db, IReadOnlyCollection<Guid> membershipIds) =>
        db.ChatThreads.Where(t => t.Kind == ChatThreadKind.Direct
            && ((t.MemberAId != null && membershipIds.Contains(t.MemberAId.Value)
                    && db.Memberships.Any(m => m.Id == t.MemberBId && m.LeftAt == null))
                || (t.MemberBId != null && membershipIds.Contains(t.MemberBId.Value)
                    && db.Memberships.Any(m => m.Id == t.MemberAId && m.LeftAt == null))));

    /// <summary>The latest message of each thread, by time and then id, among those given; a thread with none is absent.</summary>
    public static IQueryable<Message> Latest(IQueryable<Message> messages) =>
        messages.Where(m => !messages.Any(n => n.ThreadId == m.ThreadId
            && (n.SentAt > m.SentAt || (n.SentAt == m.SentAt && n.Id.CompareTo(m.Id) > 0))));
}
