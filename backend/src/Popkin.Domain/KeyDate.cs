namespace Popkin.Domain;

/// <summary>What a key date marks (known gap 103, ruled): Other is "Something else".</summary>
public enum KeyDateKind
{
    Birthday,
    Anniversary,
    Milestone,
    Other,
}

/// <summary>How far ahead of a key date its reminder comes: the six lead times (L2-138 AC1).</summary>
public enum ReminderLead
{
    OnTheDay,
    OneDayBefore,
    ThreeDaysBefore,
    OneWeekBefore,
    TwoWeeksBefore,
    OneMonthBefore,
}

/// <summary>
/// A day that matters to a contact, kept by their owner (L1-033): a birthday, an anniversary, a
/// milestone or something else, once or every year, with its own reminder (L2-138, L2-139).
/// </summary>
public sealed class KeyDate : IClientWrite
{
    public const int MaxTitleLength = 80;

    private KeyDate()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public Guid ContactId { get; private set; }

    public KeyDateKind Kind { get; private set; }

    /// <summary>"What's the day?" for Something else and a milestone; null for a birthday or anniversary.</summary>
    public string? Title { get; private set; }

    public int Month { get; private set; }

    public int Day { get; private set; }

    /// <summary>The first year, when known: it gives the age or the years (L2-137 AC3).</summary>
    public int? Year { get; private set; }

    public bool EveryYear { get; private set; }

    public ReminderLead Lead { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static KeyDate Create(
        Guid ownerId,
        Guid clientId,
        Guid contactId,
        KeyDateKind kind,
        string? title,
        int month,
        int day,
        int? year,
        bool everyYear,
        ReminderLead lead,
        DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = kind,
            Title = string.IsNullOrWhiteSpace(title) ? null : title.Trim(),
            Month = month,
            Day = day,
            Year = year,
            EveryYear = everyYear,
            Lead = lead,
            CreatedAt = now,
        };

    /// <summary>Whether a month, day and year name a real day; 29 February needs no year.</summary>
    public static bool IsDay(int month, int day, int? year) =>
        month is >= 1 and <= 12
        && day >= 1
        && (year is null
            ? day <= (month == 2 ? 29 : DateTime.DaysInMonth(2001, month))
            : year is >= 1 and <= 9999 && day <= DateTime.DaysInMonth(year.Value, month));

    /// <summary>
    /// The occurrence on or after `today`: this year's or next year's for a date every year, the
    /// one day for a one-off date, or null once a one-off date has passed (known gap 103).
    /// </summary>
    public DateOnly? NextOccurrence(DateOnly today)
    {
        if (!EveryYear)
        {
            if (Year is not { } year)
            {
                return null;
            }

            var once = On(year);
            return once >= today ? once : null;
        }

        var thisYear = On(today.Year);
        return thisYear >= today ? thisYear : On(today.Year + 1);
    }

    /// <summary>The day the reminder of an occurrence falls on (known gap 113, ruled).</summary>
    public DateOnly ReminderDay(DateOnly occursOn) => Lead switch
    {
        ReminderLead.OnTheDay => occursOn,
        ReminderLead.OneDayBefore => occursOn.AddDays(-1),
        ReminderLead.ThreeDaysBefore => occursOn.AddDays(-3),
        ReminderLead.OneWeekBefore => occursOn.AddDays(-7),
        ReminderLead.TwoWeeksBefore => occursOn.AddDays(-14),
        _ => occursOn.AddMonths(-1),
    };

    /// <summary>The age or the years at an occurrence, when the first year is known.</summary>
    public int? YearsOn(DateOnly occursOn) =>
        Year is { } year && occursOn.Year > year ? occursOn.Year - year : null;

    public void ChangeLead(ReminderLead lead) => Lead = lead;

    /// <summary>The day in `year`; 29 February falls on 28 February in a year without it.</summary>
    private DateOnly On(int year) =>
        new(year, Month, Math.Min(Day, DateTime.DaysInMonth(year, Month)));
}

/// <summary>
/// The owner's default lead time for each kind of new key date (L2-139), and how reminders reach
/// them (L2-140). An owner without a row has the defaults.
/// </summary>
public sealed class ReminderPreferences : IOwnedByPerson
{
    private ReminderPreferences()
    {
    }

    public Guid OwnerId { get; private set; }

    public ReminderLead BirthdayLead { get; private set; }

    public ReminderLead AnniversaryLead { get; private set; }

    public ReminderLead MilestoneLead { get; private set; }

    /// <summary>1 week before, 3 days before and on the day (L2-139 AC1).</summary>
    public static ReminderPreferences Defaults(Guid ownerId) => new()
    {
        OwnerId = ownerId,
        BirthdayLead = ReminderLead.OneWeekBefore,
        AnniversaryLead = ReminderLead.ThreeDaysBefore,
        MilestoneLead = ReminderLead.OnTheDay,
    };

    /// <summary>A new date's lead time; Something else starts at 1 week before (gap 113).</summary>
    public ReminderLead DefaultFor(KeyDateKind kind) => kind switch
    {
        KeyDateKind.Birthday => BirthdayLead,
        KeyDateKind.Anniversary => AnniversaryLead,
        KeyDateKind.Milestone => MilestoneLead,
        _ => ReminderLead.OneWeekBefore,
    };

    public void Change(ReminderLead birthday, ReminderLead anniversary, ReminderLead milestone)
    {
        BirthdayLead = birthday;
        AnniversaryLead = anniversary;
        MilestoneLead = milestone;
    }
}
