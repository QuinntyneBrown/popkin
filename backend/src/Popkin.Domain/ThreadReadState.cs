namespace Popkin.Domain;

/// <summary>
/// How far one member has read one thread: the last message read. Messages by others after it
/// are unread. The read point only ever moves forward (L2-027 AC4).
/// </summary>
public sealed class ThreadReadState
{
    private ThreadReadState()
    {
    }

    public Guid ThreadId { get; private set; }

    public Guid MembershipId { get; private set; }

    public Guid LastReadMessageId { get; private set; }

    /// <summary>The time of the last message read, kept so that unread messages are counted without loading it.</summary>
    public DateTimeOffset LastReadSentAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>The first read point of a member in the message's thread.</summary>
    public static ThreadReadState At(Guid membershipId, Message message, DateTimeOffset now) => new()
    {
        ThreadId = message.ThreadId,
        MembershipId = membershipId,
        LastReadMessageId = message.Id,
        LastReadSentAt = message.SentAt,
        UpdatedAt = now,
    };

    /// <summary>
    /// Moves the read point to the message when it lies after it in the thread's order, by time
    /// and then id. Returns whether it moved; an earlier message, or the same one, changes nothing.
    /// </summary>
    public bool Advance(Message message, DateTimeOffset now)
    {
        if (message.ThreadId != ThreadId)
        {
            throw new ArgumentException("The message belongs to another thread.", nameof(message));
        }

        var later = message.SentAt > LastReadSentAt
            || (message.SentAt == LastReadSentAt && message.Id.CompareTo(LastReadMessageId) > 0);
        if (!later)
        {
            return false;
        }

        LastReadMessageId = message.Id;
        LastReadSentAt = message.SentAt;
        UpdatedAt = now;
        return true;
    }
}
