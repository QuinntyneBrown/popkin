namespace Popkin.Domain;

/// <summary>
/// One emoji one member attached to one message (L2-024). A member may add several different
/// emoji to a message, each once: the message, the member and the emoji are its key.
/// </summary>
public sealed class MessageReaction
{
    /// <summary>An emoji is one grapheme cluster of at most 32 UTF-16 units.</summary>
    public const int MaxEmojiLength = 32;

    private MessageReaction()
    {
    }

    public Guid MessageId { get; private set; }

    public Guid MembershipId { get; private set; }

    public string Emoji { get; private set; } = "";

    /// <summary>When the member chose it; a summary lists each emoji in order of its first use.</summary>
    public DateTimeOffset ReactedAt { get; private set; }

    public static MessageReaction React(Guid messageId, Guid membershipId, string emoji, DateTimeOffset now) => new()
    {
        MessageId = messageId,
        MembershipId = membershipId,
        Emoji = emoji,
        ReactedAt = now,
    };
}
