namespace Popkin.Domain;

/// <summary>
/// A chat thread: Everyone, which every member shares, or a direct message between exactly two
/// members of one Popkin, which nobody but those two can read (L2-023).
/// </summary>
public sealed class ChatThread
{
    private ChatThread()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public ChatThreadKind Kind { get; private set; }

    /// <summary>The lower of the two membership ids of a direct message; null on Everyone.</summary>
    public Guid? MemberAId { get; private set; }

    /// <summary>The higher of the two membership ids of a direct message; null on Everyone.</summary>
    public Guid? MemberBId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static ChatThread Everyone(Guid popkinId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        Kind = ChatThreadKind.Everyone,
        CreatedAt = now,
    };

    /// <summary>
    /// The direct message between two memberships of one Popkin, whichever of them opens it.
    /// The pair is stored lowest first, so two members have one thread per Popkin.
    /// </summary>
    public static ChatThread Direct(Guid popkinId, Guid firstMembershipId, Guid secondMembershipId, DateTimeOffset now)
    {
        if (firstMembershipId == secondMembershipId)
        {
            throw new ArgumentException("A direct message is between two members.", nameof(secondMembershipId));
        }

        var (lower, higher) = OrderedPair(firstMembershipId, secondMembershipId);
        return new ChatThread
        {
            Id = Guid.NewGuid(),
            PopkinId = popkinId,
            Kind = ChatThreadKind.Direct,
            MemberAId = lower,
            MemberBId = higher,
            CreatedAt = now,
        };
    }

    /// <summary>Two membership ids as a direct message stores them: the lower first.</summary>
    public static (Guid Lower, Guid Higher) OrderedPair(Guid firstMembershipId, Guid secondMembershipId) =>
        firstMembershipId.CompareTo(secondMembershipId) < 0
            ? (firstMembershipId, secondMembershipId)
            : (secondMembershipId, firstMembershipId);

    /// <summary>
    /// Whether that membership of the thread's Popkin may read it and post to it: any member on
    /// Everyone, and only the two it names on a direct message (L2-023 AC2).
    /// </summary>
    public bool CanRead(Guid membershipId) =>
        Kind == ChatThreadKind.Everyone || membershipId == MemberAId || membershipId == MemberBId;

    /// <summary>The other member of a direct message, for one of its two; null on Everyone.</summary>
    public Guid? OtherThan(Guid membershipId) =>
        Kind == ChatThreadKind.Everyone ? null : membershipId == MemberAId ? MemberBId : MemberAId;
}
