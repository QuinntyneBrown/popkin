namespace Popkin.Application.Abstractions;

/// <summary>
/// Who is sent an event of a Popkin: every member with a connection open, or only the people
/// named, on every connection they hold. The events of Everyone and of the group call go to the
/// Popkin; those of a direct message and its call go to its two members alone, never to the
/// Popkin's group (L2-023 AC2, L2-051). A handler decides it; the notifier only carries it out.
/// </summary>
public sealed record Audience
{
    private Audience(Guid popkinId, IReadOnlyList<Guid>? personIds)
    {
        PopkinId = popkinId;
        PersonIds = personIds;
    }

    public Guid PopkinId { get; }

    /// <summary>The people sent the event; null when every member of the Popkin is.</summary>
    public IReadOnlyList<Guid>? PersonIds { get; }

    /// <summary>Every member of the Popkin with a connection open.</summary>
    public static Audience Popkin(Guid popkinId) => new(popkinId, null);

    /// <summary>Those people only, on every connection they hold; nobody when none is named.</summary>
    public static Audience People(Guid popkinId, IReadOnlyList<Guid> personIds) => new(popkinId, personIds);
}
