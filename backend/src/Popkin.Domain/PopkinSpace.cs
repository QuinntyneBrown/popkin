namespace Popkin.Domain;

/// <summary>
/// A Popkin: a private space for one group, with a name, an emoji, a colour, members and a length.
/// Named PopkinSpace because a class named Popkin would collide with the root namespace.
/// </summary>
public sealed class PopkinSpace
{
    private readonly List<Membership> _memberships = [];

    private PopkinSpace()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = "";

    public string Emoji { get; private set; } = "";

    public PopkinColour Colour { get; private set; }

    public Guid HostPersonId { get; private set; }

    /// <summary>When it wraps up; null when it keeps going.</summary>
    public DateTimeOffset? EndsAt { get; private set; }

    public PopkinStatus Status { get; private set; }

    public DateTimeOffset? WrappedUpAt { get; private set; }

    public bool KeepPhotos { get; private set; } = true;

    public string InviteCode { get; private set; } = "";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastActivityAt { get; private set; }

    public IReadOnlyCollection<Membership> Memberships => _memberships;

    /// <summary>
    /// Starts a Popkin with its Host as its first member (L2-010 AC6) and its Everyone thread.
    /// </summary>
    public static (PopkinSpace Popkin, ChatThread Everyone) Start(
        Person host, string name, string emoji, PopkinColour colour, DateTimeOffset? endsAt, string inviteCode, DateTimeOffset now)
    {
        var popkin = new PopkinSpace
        {
            Id = Guid.NewGuid(),
            Name = name,
            Emoji = emoji,
            Colour = colour,
            HostPersonId = host.Id,
            EndsAt = endsAt,
            Status = PopkinStatus.Active,
            InviteCode = inviteCode,
            CreatedAt = now,
            LastActivityAt = now,
        };
        popkin._memberships.Add(Membership.Join(popkin.Id, host.Id, host.Name, MembershipRole.Host, now));
        return (popkin, ChatThread.Everyone(popkin.Id, now));
    }

    public void ChangeInviteCode(string inviteCode) => InviteCode = inviteCode;
}
