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

    /// <summary>The photo store key of the member's avatar; null shows their initials (L2-013 AC6).</summary>
    public string? PhotoKey { get; private set; }

    /// <summary>The member credited with the invite; null for the Host, who started the Popkin.</summary>
    public Guid? InvitedByMembershipId { get; private set; }

    public static Membership Join(
        Guid popkinId, Guid personId, string displayName, MembershipRole role, DateTimeOffset now, Guid? invitedByMembershipId = null) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        PersonId = personId,
        DisplayName = displayName,
        Role = role,
        JoinedAt = now,
        InvitedByMembershipId = invitedByMembershipId,
    };

    public void SetPhoto(string photoKey) => PhotoKey = photoKey;

    /// <summary>
    /// The member leaves (L2-047): the membership grants nothing from now on, and what they
    /// added stays under the name it held. Coming back is a new membership.
    /// </summary>
    public void Leave(DateTimeOffset now) => LeftAt ??= now;

    /// <summary>The name the other members see changed with the account's (L2-048 AC2).</summary>
    public void Rename(string displayName) => DisplayName = displayName;
}
