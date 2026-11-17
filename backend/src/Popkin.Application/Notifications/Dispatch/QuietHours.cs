using Popkin.Application.Contacts.Reminders;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// The hours in which no activity email or phone alert is sent, where the person is (L2-161 AC6).
/// A window whose start is after its end crosses midnight.
/// </summary>
public sealed record QuietHours(TimeOnly Start, TimeOnly End)
{
    public static QuietHours Default { get; } = new(new TimeOnly(21, 0), new TimeOnly(8, 0));

    public bool Contains(TimeOnly time) =>
        Start <= End ? time >= Start && time < End : time >= Start || time < End;

    /// <summary>The first end of the window after `now`, as a UTC instant, kept to the zone's own clock.</summary>
    public DateTimeOffset EndAfter(DateTimeOffset now, TimeZoneInfo zone)
    {
        var local = TimeZoneInfo.ConvertTime(now, zone);
        var day = DateOnly.FromDateTime(local.DateTime);
        if (TimeOnly.FromDateTime(local.DateTime) >= End)
        {
            day = day.AddDays(1);
        }

        var end = day.ToDateTime(End, DateTimeKind.Unspecified);
        while (zone.IsInvalidTime(end))
        {
            end = end.AddMinutes(30);
        }

        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(end, zone), TimeSpan.Zero);
    }
}

/// <summary>Where the person is: the zone their device last saved, else UTC (L2-161 AC7).</summary>
public static class LocalClock
{
    public static TimeZoneInfo ZoneOf(string? saved) => ReminderRules.TryZone(saved) ?? TimeZoneInfo.Utc;

    public static TimeOnly TimeAt(DateTimeOffset now, TimeZoneInfo zone) =>
        TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, zone).DateTime);
}
