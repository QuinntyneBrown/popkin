namespace Popkin.Domain;

/// <summary>
/// A few words one member wrote about one photo (L2-035). Its text is kept as typed, less the
/// white space around it, and is never markup (L2-052).
/// </summary>
public sealed class PhotoComment
{
    /// <summary>A comment is at most 500 characters (L2-035 AC3).</summary>
    public const int MaxTextLength = 500;

    private PhotoComment()
    {
    }

    public Guid Id { get; private set; }

    public Guid PhotoId { get; private set; }

    public Guid AuthorMembershipId { get; private set; }

    public string Text { get; private set; } = "";

    /// <summary>When it was added; the comments of a photo are read oldest first.</summary>
    public DateTimeOffset AddedAt { get; private set; }

    public static PhotoComment Add(Guid photoId, Guid authorMembershipId, string text, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PhotoId = photoId,
        AuthorMembershipId = authorMembershipId,
        Text = text,
        AddedAt = now,
    };

    /// <summary>Only its author deletes a comment, not the Host (journey 14).</summary>
    public bool CanBeDeletedBy(Membership membership) => AuthorMembershipId == membership.Id;
}
