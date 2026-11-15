namespace Popkin.Domain;

/// <summary>
/// The wrong codes entered at the admin app for one email (L2-088 AC5, AC6). The third wrong code
/// locks the email for 15 minutes; a new code does not undo it, because the lock is kept per
/// email, not per code. Kept for every email, admin or not, so it says nothing about who is one.
/// </summary>
public sealed class AdminSignInLock
{
    public const int MaxWrongCodes = 3;

    public static readonly TimeSpan LockFor = TimeSpan.FromMinutes(15);

    private AdminSignInLock()
    {
    }

    public string Email { get; private set; } = "";

    public int WrongCodes { get; private set; }

    public DateTimeOffset? LockedUntil { get; private set; }

    public int TriesLeft => MaxWrongCodes - WrongCodes;

    public static AdminSignInLock For(string email) => new() { Email = email };

    public bool IsLocked(DateTimeOffset now) => LockedUntil is { } until && now < until;

    public void RecordWrong(DateTimeOffset now)
    {
        if (LockedUntil is { } until && now >= until)
        {
            LockedUntil = null;
        }

        WrongCodes++;
        if (WrongCodes >= MaxWrongCodes)
        {
            LockedUntil = now + LockFor;
            WrongCodes = 0;
        }
    }

    public void Reset()
    {
        WrongCodes = 0;
        LockedUntil = null;
    }
}
