namespace Popkin.Domain;

/// <summary>
/// One stretch of a member's working hours on a day (L2-074 AC8): at most two a day, each on the
/// quarter hour, in minutes from midnight (0 to 1440). A day with none is a day not working. The
/// member, the day and the stretch's index (0 or 1) are its key.
/// </summary>
public sealed class WorkingStretch
{
    private WorkingStretch()
    {
    }

    public Guid MembershipId { get; private set; }

    /// <summary>A calendar date, the same for every member.</summary>
    public DateOnly Day { get; private set; }

    /// <summary>0 for the first stretch of the day, 1 for the second.</summary>
    public int Index { get; private set; }

    public int StartMinute { get; private set; }

    public int EndMinute { get; private set; }

    public Stretch Stretch => new(StartMinute, EndMinute);

    public static WorkingStretch Of(Guid membershipId, DateOnly day, int index, int startMinute, int endMinute) =>
        new() { MembershipId = membershipId, Day = day, Index = index, StartMinute = startMinute, EndMinute = endMinute };
}
