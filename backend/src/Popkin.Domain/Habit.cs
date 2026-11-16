namespace Popkin.Domain;

/// <summary>How often a habit comes round: "Weekly", "Every 2 weeks" or "Monthly" (L2-145).</summary>
public enum HabitRhythm
{
    Weekly,
    EveryTwoWeeks,
    Monthly,
}

/// <summary>
/// The step between a habit's periods: 7 days, 14 days, or one calendar month, which keeps the day
/// or takes the month's last (Jan 31 → Feb 28). Reminders use the same rule.
/// </summary>
public static class HabitSchedule
{
    public static DateOnly Next(DateOnly from, HabitRhythm rhythm) => Step(from, rhythm, 1);

    /// <summary><paramref name="from"/> moved by <paramref name="steps"/> periods, back when negative.</summary>
    public static DateOnly Step(DateOnly from, HabitRhythm rhythm, int steps) => rhythm switch
    {
        HabitRhythm.Weekly => from.AddDays(7 * steps),
        HabitRhythm.EveryTwoWeeks => from.AddDays(14 * steps),
        _ => from.AddMonths(steps),
    };
}

/// <summary>
/// A rhythm the person keeps with one contact (L1-035): what they do together and how often. Its
/// last time is the latest day kept, else the day it started; it is due a rhythm after that, and
/// overdue once that day has passed (L2-143 AC3). One per contact; ended rather than edited
/// (known gap 105, ruled).
/// </summary>
public sealed class Habit : IClientWrite
{
    public const int MaxWhatLength = 80;

    private Habit()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public Guid ContactId { get; private set; }

    public string What { get; private set; } = string.Empty;

    public HabitRhythm Rhythm { get; private set; }

    public DateOnly StartedOn { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>When "End this habit" was chosen; null while it runs (L2-144 AC3).</summary>
    public DateTimeOffset? EndedAt { get; private set; }

    public List<HabitKept> Kept { get; private set; } = [];

    public static Habit Start(
        Guid ownerId, Guid contactId, string what, HabitRhythm rhythm, DateOnly startedOn, Guid clientId, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            What = what,
            Rhythm = rhythm,
            StartedOn = startedOn,
            CreatedAt = now,
        };

    public DateOnly LastTime => Kept.Count == 0 ? StartedOn : Kept.Max(k => k.KeptOn);

    public DateOnly DueOn() => HabitSchedule.Next(LastTime, Rhythm);

    public bool IsOverdue(DateOnly today) => today > DueOn();

    /// <summary>"We met up" (L2-144 AC1): kept on that day.</summary>
    public HabitKept Keep(DateOnly keptOn, Guid clientId, DateTimeOffset now)
    {
        var kept = new HabitKept(Guid.NewGuid(), Id, keptOn, clientId, now);
        Kept.Add(kept);
        return kept;
    }

    public void End(DateTimeOffset now) => EndedAt ??= now;

    public void Resume() => EndedAt = null;
}

/// <summary>A day a habit was kept, by "We met up"; Undo removes it (L2-144).</summary>
public sealed class HabitKept
{
    private HabitKept()
    {
    }

    public HabitKept(Guid id, Guid habitId, DateOnly keptOn, Guid clientId, DateTimeOffset createdAt)
    {
        Id = id;
        HabitId = habitId;
        KeptOn = keptOn;
        ClientId = clientId;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }

    public Guid HabitId { get; private set; }

    public DateOnly KeptOn { get; private set; }

    public Guid ClientId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }
}
