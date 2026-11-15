namespace Popkin.Domain;

/// <summary>A working stretch of one day, in minutes from midnight: 0 to 1440, end after start.</summary>
public sealed record Stretch(int StartMinute, int EndMinute);

/// <summary>One evening of the group: who is free, and from when everyone is (L2-074 AC2 to AC4).</summary>
/// <param name="FreeCount">How many members are free.</param>
/// <param name="EveryoneFreeFrom">The minute everyone is free from, when everyone is; else null.</param>
/// <param name="LastOffShift">The members, by index, whose work ends at that minute, when it is after 5 pm.</param>
/// <param name="Working">The members, by index, who work in the evening.</param>
public sealed record Evening(int FreeCount, int? EveryoneFreeFrom, IReadOnlyList<int> LastOffShift, IReadOnlyList<int> Working);

/// <summary>Free means not working between 8 and 11 pm (L2-074 AC2).</summary>
public static class EveningFreedom
{
    public const int EveningStart = 20 * 60;
    public const int EveningEnd = 23 * 60;

    /// <summary>The earliest time the headline names: "free from 5 pm" when nobody works later.</summary>
    public const int EarliestFree = 17 * 60;

    public static bool IsFree(IEnumerable<Stretch> day) =>
        !day.Any(s => s.StartMinute < EveningEnd && s.EndMinute > EveningStart);

    /// <summary>The evening of one day, from each member's stretches, in the members' order.</summary>
    public static Evening Of(IReadOnlyList<IReadOnlyCollection<Stretch>> members)
    {
        var working = Enumerable.Range(0, members.Count).Where(i => !IsFree(members[i])).ToList();
        if (working.Count > 0)
        {
            return new Evening(members.Count - working.Count, null, [], working);
        }

        // Everyone is free: from the last end before the evening, and never before 5 pm.
        var ends = members.Select(day => day.Select(s => s.EndMinute).Where(end => end <= EveningStart).DefaultIfEmpty(0).Max()).ToList();
        var from = Math.Max(EarliestFree, ends.Max());
        var last = from > EarliestFree ? Enumerable.Range(0, members.Count).Where(i => ends[i] == from).ToList() : [];
        return new Evening(members.Count, from, last, []);
    }
}
