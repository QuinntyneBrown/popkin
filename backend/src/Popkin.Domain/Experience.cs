namespace Popkin.Domain;

/// <summary>The kind of an experience: "Something we did", "Restaurant" or "Want to do" (L2-040 AC1).</summary>
public enum ExperienceKind
{
    Did,
    Restaurant,
    Want,
}

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

    public DateTimeOffset SharedAt { get; private set; }

    public static Experience Share(
        Guid popkinId, Guid sharerMembershipId, ExperienceKind kind, string title, string? when, string? place, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        SharerMembershipId = sharerMembershipId,
        Kind = kind,
        Title = title,
        When = when,
        Place = place,
        SharedAt = now,
    };
}
