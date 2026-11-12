namespace Popkin.Domain;

/// <summary>A person's place in one Popkin. Membership decides everything a person sees (L2-051).</summary>
public sealed class Membership
{
    private Membership()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public Guid PersonId { get; private set; }

    public MembershipRole Role { get; private set; }

    /// <summary>The name the other members see.</summary>
    public string DisplayName { get; private set; } = "";

    public DateTimeOffset JoinedAt { get; private set; }

    public DateTimeOffset? LeftAt { get; private set; }

    public static Membership Join(Guid popkinId, Guid personId, string displayName, MembershipRole role, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        PersonId = personId,
        DisplayName = displayName,
        Role = role,
        JoinedAt = now,
    };
}
