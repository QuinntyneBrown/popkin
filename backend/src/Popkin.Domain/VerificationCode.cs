namespace Popkin.Domain;

/// <summary>
/// One issued six-digit code. Only its keyed hash is kept (L2-054 AC4). It lasts 10 minutes
/// (L2-004 AC4), allows five wrong attempts (L2-005 AC3) and works once (L2-005 AC5).
/// </summary>
public sealed class VerificationCode
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ResendAfter = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan LimitWindow = TimeSpan.FromHours(1);
    public const int MaxPerWindow = 5;
    public const int MaxAttempts = 5;

    private VerificationCode()
    {
    }

    public Guid Id { get; private set; }

    public ContactChannel Channel { get; private set; }

    /// <summary>The normalised phone number (E.164) or email.</summary>
    public string Destination { get; private set; } = "";

    public string CodeHash { get; private set; } = "";

    public CodePurpose Purpose { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    public int Attempts { get; private set; }

    /// <summary>Set when the code was used, superseded by a newer code, or never sent.</summary>
    public DateTimeOffset? ConsumedAt { get; private set; }

    public DateTimeOffset ResendAvailableAt => SentAt + ResendAfter;

    public static VerificationCode Issue(ContactChannel channel, string destination, CodePurpose purpose, string codeHash, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        Channel = channel,
        Destination = destination,
        Purpose = purpose,
        CodeHash = codeHash,
        SentAt = now,
        ExpiresAt = now + Lifetime,
    };

    public bool IsExpired(DateTimeOffset now) => now >= ExpiresAt;

    public bool IsConsumed => ConsumedAt is not null;

    public bool AttemptsExhausted => Attempts >= MaxAttempts;

    public int AttemptsLeft => Math.Max(0, MaxAttempts - Attempts);

    public void RecordFailedAttempt() => Attempts++;

    public void Consume(DateTimeOffset now) => ConsumedAt ??= now;

    /// <summary>A newer code for the same destination and purpose stops this one working (L2-005 AC2).</summary>
    public void Supersede(DateTimeOffset now) => Consume(now);
}
