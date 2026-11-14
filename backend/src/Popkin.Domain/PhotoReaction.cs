namespace Popkin.Domain;

/// <summary>
/// One emoji one member gave one photo (L2-034). A member may give a photo several different
/// emoji, each once, as chat allows for a message: the photo, the member and the emoji are its key.
/// </summary>
public sealed class PhotoReaction
{
    private PhotoReaction()
    {
    }

    public Guid PhotoId { get; private set; }

    public Guid MembershipId { get; private set; }

    public string Emoji { get; private set; } = "";

    /// <summary>When the member gave it; the photo's reactions are listed in order of each emoji's first use.</summary>
    public DateTimeOffset ReactedAt { get; private set; }

    public static PhotoReaction React(Guid photoId, Guid membershipId, string emoji, DateTimeOffset now) => new()
    {
        PhotoId = photoId,
        MembershipId = membershipId,
        Emoji = emoji,
        ReactedAt = now,
    };
}
