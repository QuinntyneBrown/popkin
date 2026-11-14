namespace Popkin.Domain;

public enum MessageKind
{
    Member,
    System,
}

/// <summary>
/// A message in a thread, posted by one member at a time the server assigns. Its text is kept
/// as typed and is never markup (L2-052).
/// </summary>
public sealed class Message
{
    /// <summary>A message is at most 2,000 characters (L2-021 AC7).</summary>
    public const int MaxTextLength = 2000;

    private Message()
    {
    }

    public Guid Id { get; private set; }

    public Guid ThreadId { get; private set; }

    public Guid AuthorMembershipId { get; private set; }

    public string Text { get; private set; } = "";

    /// <summary>The name the author's device gave it, stored once per author; null for a system message.</summary>
    public Guid? ClientMessageId { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    public MessageKind Kind { get; private set; }

    /// <summary>When it was deleted; a deleted message is never read again.</summary>
    public DateTimeOffset? DeletedAt { get; private set; }

    /// <summary>
    /// The earlier message of the same thread this one replies to; null when it replies to
    /// nothing. Messages are only soft-deleted, so the link never dangles (L2-025).
    /// </summary>
    public Guid? ReplyToMessageId { get; private set; }

    /// <summary>The photo the message carries, uploaded for its thread by its author; null for a message of text alone (L2-026).</summary>
    public Guid? PhotoId { get; private set; }

    /// <summary>
    /// Whether the photo it carried was removed, deleted from Photos or with an album that was not
    /// kept: it then reads "Photo removed", told apart from a message that never had one (L2-036 AC3).
    /// </summary>
    public bool PhotoRemoved { get; private set; }

    /// <summary>The photo it carried was removed: the message keeps its text and carries none.</summary>
    public void RemovePhoto()
    {
        PhotoId = null;
        PhotoRemoved = true;
    }

    public static Message Send(
        Guid threadId, Guid authorMembershipId, string text, Guid clientMessageId, DateTimeOffset now, Message? replyTo = null, Photo? photo = null)
    {
        if (replyTo is not null && replyTo.ThreadId != threadId)
        {
            throw new ArgumentException("A reply answers a message of the same thread.", nameof(replyTo));
        }

        if (photo is not null && (photo.ThreadId != threadId || photo.UploaderMembershipId != authorMembershipId))
        {
            throw new ArgumentException("A message carries a photo its author uploaded for its thread.", nameof(photo));
        }

        return new Message
        {
            Id = Guid.NewGuid(),
            ThreadId = threadId,
            AuthorMembershipId = authorMembershipId,
            Text = text,
            ClientMessageId = clientMessageId,
            SentAt = now,
            Kind = MessageKind.Member,
            ReplyToMessageId = replyTo?.Id,
            PhotoId = photo?.Id,
        };
    }

    /// <summary>The note Popkin writes into Everyone when someone joins, at the time they joined (L2-014 AC4).</summary>
    public static Message PoppedIn(Guid threadId, Membership joiner) => new()
    {
        Id = Guid.NewGuid(),
        ThreadId = threadId,
        AuthorMembershipId = joiner.Id,
        Text = $"{joiner.DisplayName} popped in. Say hi! 👋",
        SentAt = joiner.JoinedAt,
        Kind = MessageKind.System,
    };

    /// <summary>
    /// Rises by one with every change to the message's reactions, so a client drops a summary
    /// older than the one it holds; a repeat that changes nothing leaves it as it is.
    /// </summary>
    public int ReactionsVersion { get; private set; }

    /// <summary>A reaction was added to the message or taken off it.</summary>
    public void ReactionsChanged() => ReactionsVersion++;

    /// <summary>Deletes the message: its text is not kept. Deleting twice changes nothing.</summary>
    public void Delete(DateTimeOffset now)
    {
        DeletedAt ??= now;
        Text = "";
    }

    /// <summary>Only its author deletes a message (L2-024).</summary>
    public bool CanBeDeletedBy(Membership membership) => AuthorMembershipId == membership.Id;
}
