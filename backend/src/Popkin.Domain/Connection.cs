namespace Popkin.Domain;

/// <summary>How two contacts know each other (L2-150): family, partner, friend or work.</summary>
public enum ConnectionKind
{
    Family,
    Partner,
    Friend,
    Work,
}

/// <summary>
/// Two of a person's contacts and how they know each other (L1-037), in the owner's words, the
/// same from either side. The pair is kept smaller id first, so one pair is one row whichever way
/// it was made; while <see cref="Promised"/> its line is dotted (known gap 109, ruled).
/// </summary>
public sealed class Connection : IClientWrite
{
    public const int MaxWordsLength = 60;

    private Connection()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    /// <summary>The contact of the pair with the smaller id.</summary>
    public Guid ContactId { get; private set; }

    /// <summary>The contact of the pair with the larger id.</summary>
    public Guid OtherContactId { get; private set; }

    public ConnectionKind Kind { get; private set; }

    /// <summary>"Married", "Mum": in the owner's words, or none.</summary>
    public string? Words { get; private set; }

    /// <summary>An introduction the owner has promised and not made yet.</summary>
    public bool Promised { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static Connection Connect(
        Guid ownerId, Guid contactId, Guid otherContactId, ConnectionKind kind, string? words, bool promised, Guid clientId, DateTimeOffset now)
    {
        if (contactId == otherContactId)
        {
            throw new ArgumentException("A contact is not connected to itself.", nameof(otherContactId));
        }

        var (first, second) = Order(contactId, otherContactId);
        return new Connection
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = first,
            OtherContactId = second,
            Kind = kind,
            Words = words,
            Promised = promised,
            CreatedAt = now,
        };
    }

    /// <summary>The pair in the order it is kept: the smaller id first.</summary>
    public static (Guid First, Guid Second) Order(Guid a, Guid b) => a.CompareTo(b) < 0 ? (a, b) : (b, a);

    public bool Joins(Guid contactId) => ContactId == contactId || OtherContactId == contactId;

    /// <summary>The contact at the other end from <paramref name="contactId"/>.</summary>
    public Guid Other(Guid contactId) => ContactId == contactId ? OtherContactId : ContactId;
}
