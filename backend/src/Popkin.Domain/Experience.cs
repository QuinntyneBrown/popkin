namespace Popkin.Domain;

/// <summary>The kind of an experience: "Something we did", "Restaurant" or "Want to do" (L2-040 AC1).</summary>
public enum ExperienceKind
{
    Did,
    Restaurant,
    Want,
}

/// <summary>The photo store keys of an experience's picture: its display image and its thumbnail.</summary>
public sealed record ExperiencePicture(string Key, string ThumbnailKey);

/// <summary>
/// Something the group did, a restaurant, or something the group wants to do, shared in a Popkin
/// by one member, which members rate and comment on (L2-037 to L2-041).
/// </summary>
public sealed class Experience
{
    /// <summary>A title is at most 80 characters (L2-040 AC2).</summary>
    public const int MaxTitleLength = 80;

    /// <summary>A place is at most 80 characters (L2-040 AC3).</summary>
    public const int MaxPlaceLength = 80;

    /// <summary>A "when" is free text of at most 40 characters.</summary>
    public const int MaxWhenLength = 40;

    private Experience()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public Guid SharerMembershipId { get; private set; }

    public ExperienceKind Kind { get; private set; }

    public string Title { get; private set; } = "";

    /// <summary>When it happened, in the sharer's words, such as "Sat morning".</summary>
    public string? When { get; private set; }

    public string? Place { get; private set; }

    /// <summary>The photo store key of the picture's display image; null shows the Popkin's emoji on its colour (L2-040 AC5).</summary>
    public string? PictureKey { get; private set; }

    /// <summary>The photo store key of the picture's thumbnail.</summary>
    public string? PictureThumbnailKey { get; private set; }

    public DateTimeOffset SharedAt { get; private set; }

    public ExperiencePicture? Picture =>
        PictureKey is { } key && PictureThumbnailKey is { } thumbnailKey ? new ExperiencePicture(key, thumbnailKey) : null;

    /// <summary>Something the group did and a restaurant are rated; something it wants to do is not.</summary>
    public bool IsRateable => Kind != ExperienceKind.Want;

    /// <summary>Only its sharer edits an experience (L2-040 AC6).</summary>
    public bool CanBeEditedBy(Membership member) => member.Id == SharerMembershipId;

    /// <summary>Its sharer deletes an experience, and the Host deletes any (L2-040 AC6).</summary>
    public bool CanBeDeletedBy(Membership member) => CanBeEditedBy(member) || member.Role == MembershipRole.Host;

    /// <summary>A member's first rating of this experience, from one to five stars (L2-039).</summary>
    public ExperienceRating Rate(Guid membershipId, int stars, DateTimeOffset now) =>
        IsRateable
            ? ExperienceRating.Give(Id, membershipId, stars, now)
            : throw new InvalidOperationException("Something the group wants to do is not rated.");

    public static Experience Share(
        Guid popkinId,
        Guid sharerMembershipId,
        ExperienceKind kind,
        string title,
        string? when,
        string? place,
        ExperiencePicture? picture,
        DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        SharerMembershipId = sharerMembershipId,
        Kind = kind,
        Title = title,
        When = when,
        Place = place,
        PictureKey = picture?.Key,
        PictureThumbnailKey = picture?.ThumbnailKey,
        SharedAt = now,
    };
}
