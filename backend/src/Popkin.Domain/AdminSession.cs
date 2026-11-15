namespace Popkin.Domain;

/// <summary>
/// One browser's sign-in to the admin app, apart from any Popkin app session (L2-078 AC5). It
/// lasts 12 hours, a working day, and ends at once when it is revoked or its admin is removed.
/// </summary>
public sealed class AdminSession
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(12);

    private AdminSession()
    {
    }

    public Guid Id { get; private set; }

    public Guid AdminId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public static AdminSession Start(Guid adminId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        AdminId = adminId,
        CreatedAt = now,
        ExpiresAt = now + Lifetime,
    };

    public bool IsLive(DateTimeOffset now) => RevokedAt is null && now < ExpiresAt;

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;
}
