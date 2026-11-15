using System.Globalization;

namespace Popkin.Domain;

/// <summary>
/// A day of a member's working hours (L2-074 AC8): at most two stretches, each starting and
/// ending on the quarter hour, its end after its start, the second after the first.
/// </summary>
public static class WorkingHours
{
    public const int MaxStretches = 2;
    public const int QuarterHour = 15;
    public const int MinutesInADay = 24 * 60;

    public static bool IsValid(IReadOnlyList<Stretch> day)
    {
        if (day.Count > MaxStretches)
        {
            return false;
        }

        for (var i = 0; i < day.Count; i++)
        {
            var stretch = day[i];
            if (stretch.StartMinute % QuarterHour != 0 || stretch.EndMinute % QuarterHour != 0
                || stretch.StartMinute < 0 || stretch.EndMinute > MinutesInADay
                || stretch.EndMinute <= stretch.StartMinute
                || (i > 0 && stretch.StartMinute < day[i - 1].EndMinute))
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>A time "HH:mm" as minutes from midnight; "24:00" is the end of the day. Null for anything else.</summary>
    public static int? MinutesOf(string time)
    {
        if (time is not { Length: 5 } || time[2] != ':'
            || !int.TryParse(time.AsSpan(0, 2), NumberStyles.None, CultureInfo.InvariantCulture, out var hours)
            || !int.TryParse(time.AsSpan(3, 2), NumberStyles.None, CultureInfo.InvariantCulture, out var minutes)
            || minutes > 59)
        {
            return null;
        }

        var total = hours * 60 + minutes;
        return total <= MinutesInADay ? total : null;
    }
}
