namespace Popkin.Domain;

/// <summary>
/// One device's sign-in. It lasts 30 days from sign in (L2-007 AC1) and ends at once when it is
/// revoked (L2-050 AC3). The 30 days are absolute; sliding expiry is not used.
/// </summary>
public sealed class Session
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    private Session()
    {
    }

    public Guid Id { get; private set; }

    public Guid PersonId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public static Session Start(Guid personId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PersonId = personId,
        CreatedAt = now,
        ExpiresAt = now + Lifetime,
    };

    public bool IsLive(DateTimeOffset now) => RevokedAt is null && now < ExpiresAt;

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;
}
