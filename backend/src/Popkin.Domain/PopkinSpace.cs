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

    /// <summary>How long the photos of a Popkin wrapped up without its album stay (L2-045 AC4).</summary>
    public static readonly TimeSpan PhotosStayFor = TimeSpan.FromDays(30);

    /// <summary>When the photos go: 30 days after the wrap-up when the album was not kept, never otherwise.</summary>
    public DateTimeOffset? PhotosRemoveAt => WrappedUpAt is { } wrappedUpAt && !KeepPhotos ? wrappedUpAt + PhotosStayFor : null;

    /// <summary>When the photos were removed; null while the album is there.</summary>
    public DateTimeOffset? PhotosRemovedAt { get; private set; }

    /// <summary>How many photos the album held when it was removed, so the recap still counts them (L2-046 AC2).</summary>
    public int? PhotosRemovedCount { get; private set; }

    public string InviteCode { get; private set; } = "";

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset LastActivityAt { get; private set; }

    /// <summary>
    /// Rises when the Popkin wraps up. Two wrap-ups at once, the Host's and the clock's, cannot
    /// both be saved from the same version.
    /// </summary>
    public long Version { get; private set; }

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

    /// <summary>
    /// A person joins as a member under the name they give (L2-013). The invite link does not say
    /// which member shared it, so the Host is credited with the invite.
    /// </summary>
    public Membership Join(Guid personId, string displayName, Guid hostMembershipId, DateTimeOffset now)
    {
        LastActivityAt = now;
        return Membership.Join(Id, personId, displayName, MembershipRole.Member, now, hostMembershipId);
    }

    public void ChangeInviteCode(string inviteCode) => InviteCode = inviteCode;

    /// <summary>
    /// The Host gives the Popkin a new name, emoji or colour (L2-020 AC3). The version rises, so
    /// a member who hears of an older look drops it.
    /// </summary>
    public void ChangeLook(string name, string emoji, PopkinColour colour)
    {
        RequireActive();
        Name = name;
        Emoji = emoji;
        Colour = colour;
        Version++;
    }

    private void RequireActive()
    {
        if (Status == PopkinStatus.WrappedUp)
        {
            throw new InvalidOperationException("A wrapped-up Popkin does not change.");
        }
    }

    /// <summary>
    /// Wraps the Popkin up: from now on it is read-only (L2-045), and its photo album is kept or
    /// goes 30 days later, as chosen (L2-043 AC2). A Popkin wraps up once.
    /// </summary>
    public void WrapUp(DateTimeOffset at, bool keepPhotos)
    {
        if (Status == PopkinStatus.WrappedUp)
        {
            throw new InvalidOperationException("The Popkin has wrapped up already.");
        }

        Status = PopkinStatus.WrappedUp;
        WrappedUpAt = at;
        KeepPhotos = keepPhotos;
        Version++;
    }

    /// <summary>Records that the photos of a Popkin wrapped up without its album were removed (L2-045 AC4).</summary>
    public void RemovePhotos(DateTimeOffset at, int photoCount)
    {
        if (PhotosRemoveAt is null)
        {
            throw new InvalidOperationException("The photos of this Popkin are kept.");
        }

        PhotosRemovedAt = at;
        PhotosRemovedCount = photoCount;
    }
}
