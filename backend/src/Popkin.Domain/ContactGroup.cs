namespace Popkin.Domain;

/// <summary>A group's kind, in the order Groups lists them (L2-146 AC1).</summary>
public enum GroupKind
{
    Household,
    SmallGroup,
    Team,
    Club,
}

/// <summary>
/// A group of the owner's contacts: a household, a small group, a team or a club (L1-036). It is
/// kept as made (L2-147 AC7): its members change only through their own Edit or their deletion.
/// Only "Start a Popkin with them" links it to a Popkin (L2-148 AC4).
/// </summary>
public sealed class ContactGroup : IClientWrite
{
    public const int MaxNameLength = 40;
    public const int MaxNoteLength = 500;

    private readonly List<ContactGroupMember> members = [];

    private ContactGroup()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public string Name { get; private set; } = "";

    public GroupKind Kind { get; private set; }

    public string? Note { get; private set; }

    /// <summary>The Popkin "Start a Popkin with them" made for it, if any.</summary>
    public Guid? PopkinId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyList<ContactGroupMember> Members => members;

    /// <summary>The emoji follows the kind (L2-146 AC6).</summary>
    public string Emoji => EmojiOf(Kind);

    public static string EmojiOf(GroupKind kind) => kind switch
    {
        GroupKind.Household => "🏡",
        GroupKind.SmallGroup => "🕯️",
        GroupKind.Team => "🤝",
        _ => "⭐",
    };

    public static ContactGroup Make(
        Guid ownerId, string name, GroupKind kind, string? note, IEnumerable<Guid> contactIds, Guid clientId, DateTimeOffset now)
    {
        var group = new ContactGroup
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            Name = name,
            Kind = kind,
            Note = note,
            CreatedAt = now,
        };
        group.Add(contactIds, now);
        return group;
    }

    /// <summary>Adds those not in it yet; a member already in it is left as they are.</summary>
    public void Add(IEnumerable<Guid> contactIds, DateTimeOffset now)
    {
        foreach (var id in contactIds.Distinct())
        {
            if (members.All(m => m.ContactId != id))
            {
                members.Add(new ContactGroupMember(Id, id, now));
            }
        }
    }

    /// <summary>
    /// Links the group to a Popkin. False when it is linked to it already, so its invite is not
    /// sent again. A link to another Popkin is replaced only when `previousStillOpen` is false: the
    /// person has left it (L2-148 AC4).
    /// </summary>
    public bool LinkTo(Guid popkinId, bool previousStillOpen)
    {
        if (PopkinId == popkinId)
        {
            return false;
        }

        if (PopkinId is not null && previousStillOpen)
        {
            throw new InvalidOperationException("The group is linked to another Popkin.");
        }

        PopkinId = popkinId;
        return true;
    }
}

/// <summary>A contact in a group.</summary>
public sealed class ContactGroupMember
{
    private ContactGroupMember()
    {
    }

    public ContactGroupMember(Guid groupId, Guid contactId, DateTimeOffset addedAt)
    {
        GroupId = groupId;
        ContactId = contactId;
        AddedAt = addedAt;
    }

    public Guid GroupId { get; private set; }

    public Guid ContactId { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }
}
