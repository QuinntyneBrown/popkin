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

    public static Message Send(Guid threadId, Guid authorMembershipId, string text, Guid clientMessageId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        ThreadId = threadId,
        AuthorMembershipId = authorMembershipId,
        Text = text,
        ClientMessageId = clientMessageId,
        SentAt = now,
        Kind = MessageKind.Member,
    };

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

    /// <summary>Deletes the message: its text is not kept. Deleting twice changes nothing.</summary>
    public void Delete(DateTimeOffset now)
    {
        DeletedAt ??= now;
        Text = "";
    }

    /// <summary>Only its author deletes a message (L2-024).</summary>
    public bool CanBeDeletedBy(Membership membership) => AuthorMembershipId == membership.Id;
}
