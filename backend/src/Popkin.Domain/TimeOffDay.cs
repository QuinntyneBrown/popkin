namespace Popkin.Domain;

/// <summary>A day a member is off, or plans to be (L2-073).</summary>
public enum TimeOffKind
{
    Off,
    Tentative,
}

/// <summary>
/// One member's day off (L2-072). A weekday with no entry is Working: nothing is stored for it.
/// The member and the day are its key.
/// </summary>
public sealed class TimeOffDay
{
    private TimeOffDay()
    {
    }

    public Guid MembershipId { get; private set; }

    /// <summary>A calendar date, the same for every member.</summary>
    public DateOnly Day { get; private set; }

    public TimeOffKind Kind { get; private set; }

    public static TimeOffDay Of(Guid membershipId, DateOnly day, TimeOffKind kind) =>
        new() { MembershipId = membershipId, Day = day, Kind = kind };
}
