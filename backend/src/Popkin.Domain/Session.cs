namespace Popkin.Domain;

/// <summary>
/// One device's sign-in. It lasts the sign-in length from its last use (L2-176 AC2, L2-007 AC1)
/// and ends at once when it is revoked (L2-050 AC3).
/// </summary>
public sealed class Session
{
    /// <summary>A use renews the session only when it moves the expiry by at least this, so an active device writes at most once an hour.</summary>
    public static readonly TimeSpan RenewStep = TimeSpan.FromHours(1);

    private Session()
    {
    }

    public Guid Id { get; private set; }

    public Guid PersonId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public static Session Start(Guid personId, DateTimeOffset now, TimeSpan length) => new()
    {
        Id = Guid.NewGuid(),
        PersonId = personId,
        CreatedAt = now,
        ExpiresAt = now + length,
    };

    public bool IsLive(DateTimeOffset now) => RevokedAt is null && now < ExpiresAt;

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;

    /// <summary>
    /// A use of a live session: it lasts the sign-in length from now. Moves the expiry when it is
    /// at least <see cref="RenewStep"/> later, or earlier because the length was shortened
    /// (L2-176 AC6), and says whether it moved.
    /// </summary>
    public bool Renew(DateTimeOffset now, TimeSpan length)
    {
        if (!IsLive(now))
        {
            return false;
        }

        var expiresAt = now + length;
        if (expiresAt < ExpiresAt || expiresAt - ExpiresAt >= RenewStep)
        {
            ExpiresAt = expiresAt;
            return true;
        }

        return false;
    }
}
