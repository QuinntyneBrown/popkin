namespace Popkin.Domain;

/// <summary>A chat thread: Everyone, which every member shares, or a direct message.</summary>
public sealed class ChatThread
{
    private ChatThread()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public ChatThreadKind Kind { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static ChatThread Everyone(Guid popkinId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        Kind = ChatThreadKind.Everyone,
        CreatedAt = now,
    };
}
