namespace Popkin.Domain;

/// <summary>
/// A limit an Owner changes on Limits without a release (docs/detailed-designs/admin-platform/limits).
/// The upload sizes and rate limits join it with their slices.
/// </summary>
public enum LimitKey
{
    /// <summary>Days a sign-in lasts after its last use (L2-176).</summary>
    SessionDays,
}

/// <summary>The one home of each limit's default and bounds: the value it holds until an Owner changes it.</summary>
public static class LimitDefaults
{
    /// <summary>Whole numbers of 1 or more; a limit with a maximum names it here.</summary>
    public const int Minimum = 1;

    public static int Of(LimitKey limit) => limit switch
    {
        LimitKey.SessionDays => 365,
        _ => throw new ArgumentOutOfRangeException(nameof(limit), limit, null),
    };

    /// <summary>The largest value, or null when only the minimum binds. 400 days is the longest a browser keeps a cookie.</summary>
    public static int? MaximumOf(LimitKey limit) => limit switch
    {
        LimitKey.SessionDays => 400,
        _ => null,
    };

    public static bool Allows(LimitKey limit, int value) =>
        value >= Minimum && (MaximumOf(limit) is not { } max || value <= max);
}
