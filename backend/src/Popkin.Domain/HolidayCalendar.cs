namespace Popkin.Domain;

/// <summary>How a holiday's date is known (L2-196 AC4).</summary>
public enum HolidayStatus
{
    /// <summary>Follows a rule; nothing to confirm.</summary>
    ByRule,

    /// <summary>Expected, until an admin confirms it; members see it as "expected".</summary>
    Estimated,

    /// <summary>Confirmed by an admin.</summary>
    Confirmed,
}

/// <summary>
/// A holiday calendar people and Popkins observe (L1-045): its name, what it holds ("Federal and
/// widely observed") and how its dates are set ("Moon sighting, confirmed by hand").
/// </summary>
public sealed class HolidayCalendar
{
    public const int MaxNameLength = 80;
    public const int MaxTextLength = 120;

    private HolidayCalendar()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>A stable name for the seed, so it adds each calendar once.</summary>
    public string Key { get; private set; } = "";

    public string Name { get; private set; } = "";

    public string Holds { get; private set; } = "";

    public string HowSet { get; private set; } = "";

    public DateTimeOffset CreatedAt { get; private set; }

    public static HolidayCalendar Create(string key, string name, string holds, string howSet, DateTimeOffset now) =>
        new() { Id = Guid.NewGuid(), Key = key, Name = name, Holds = holds, HowSet = howSet, CreatedAt = now };
}

/// <summary>A year of a calendar; people see its holidays once it is published (L2-197 AC4).</summary>
public sealed class HolidayCalendarYear
{
    private HolidayCalendarYear()
    {
    }

    public Guid CalendarId { get; private set; }

    public int Year { get; private set; }

    public DateTimeOffset? PublishedAt { get; private set; }

    /// <summary>The admin who published it; null when Popkin's seed did.</summary>
    public Guid? PublishedByAdminId { get; private set; }

    public bool IsPublished => PublishedAt is not null;

    public static HolidayCalendarYear Start(Guid calendarId, int year) => new() { CalendarId = calendarId, Year = year };

    /// <summary>Publishes the year; false when it already is, which changes nothing.</summary>
    public bool Publish(Guid? adminId, DateTimeOffset now)
    {
        if (IsPublished)
        {
            return false;
        }

        PublishedAt = now;
        PublishedByAdminId = adminId;
        return true;
    }
}

/// <summary>A holiday of a calendar in one year (L2-196 AC4).</summary>
public sealed class Holiday
{
    public const int MaxNameLength = 80;
    public const int MaxNoteLength = 80;

    private Holiday()
    {
    }

    public Guid Id { get; private set; }

    public Guid CalendarId { get; private set; }

    public int Year { get; private set; }

    public string Name { get; private set; } = "";

    /// <summary>"Could be 19 Feb", "Observed Fri 3 Jul".</summary>
    public string? Note { get; private set; }

    public DateOnly Date { get; private set; }

    public HolidayStatus Status { get; private set; }

    /// <summary>When an admin last changed its date; null while it is as the seed set it.</summary>
    public DateTimeOffset? ChangedAt { get; private set; }

    public Guid? ChangedByAdminId { get; private set; }

    public static Holiday Add(Guid calendarId, string name, string? note, DateOnly date, HolidayStatus status) =>
        new() { Id = Guid.NewGuid(), CalendarId = calendarId, Year = date.Year, Name = name, Note = note, Date = date, Status = status };
}

/// <summary>"Dates through", the warning and the years of the Holiday calendars page (L2-196).</summary>
public static class HolidayCalendarRules
{
    /// <summary>The last year published, or null for a draft.</summary>
    public static int? DatesThrough(IReadOnlyCollection<int> published) => published.Count == 0 ? null : published.Max();

    public static bool IsDraft(IReadOnlyCollection<int> published) => published.Count == 0;

    /// <summary>A published calendar with no dates after this year; a draft reaches nobody, so it is never warned.</summary>
    public static bool NeedsDates(IReadOnlyCollection<int> published, int thisYear) =>
        DatesThrough(published) is { } through && through <= thisYear;

    /// <summary>The tabs: this year and the two after it.</summary>
    public static IReadOnlyList<int> Years(int thisYear) => [thisYear, thisYear + 1, thisYear + 2];

    /// <summary>The first year after this year not yet published, else this year.</summary>
    public static int ChosenYear(IReadOnlyCollection<int> published, int thisYear) =>
        Years(thisYear).Skip(1).Where(y => !published.Contains(y)).Cast<int?>().FirstOrDefault() ?? thisYear;
}
