namespace Popkin.Domain;

/// <summary>
/// A Popkin's one sprint (L2-068): "Planning sprint", from the day its first story is added for
/// 28 days. It holds the stories in To do, Doing and Done. Its version rises with every change to
/// the plan, so a member who hears of an older plan reads it again.
/// </summary>
public sealed class Sprint
{
    /// <summary>The name every sprint has, until a sprint can be named (L2-068).</summary>
    public const string DefaultName = "Planning sprint";

    /// <summary>The days after its first that its last day comes: 28 days in all.</summary>
    public const int LastDayOffset = 27;

    private Sprint()
    {
    }

    /// <summary>The Popkin it belongs to, which has one.</summary>
    public Guid PopkinId { get; private set; }

    public string Name { get; private set; } = "";

    /// <summary>A calendar day in UTC.</summary>
    public DateOnly FirstDay { get; private set; }

    public DateOnly LastDay => FirstDay.AddDays(LastDayOffset);

    public long Version { get; private set; }

    public static Sprint Start(Guid popkinId, DateOnly firstDay) =>
        new() { PopkinId = popkinId, Name = DefaultName, FirstDay = firstDay, Version = 1 };

    /// <summary>The days from today to the last day, never fewer than 0 (L2-068 AC13).</summary>
    public int DaysLeft(DateOnly today) => Math.Max(0, LastDay.DayNumber - today.DayNumber);

    /// <summary>The plan changed: a story was added, moved, changed or deleted.</summary>
    public void Changed() => Version++;
}
