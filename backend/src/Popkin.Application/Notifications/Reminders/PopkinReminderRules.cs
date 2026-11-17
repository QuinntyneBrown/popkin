namespace Popkin.Application.Notifications.Reminders;

/// <summary>When a Popkin's reminders are due (send-reminders, L2-162). Pure: no database, no clock.</summary>
public static class PopkinReminderRules
{
    /// <summary>The hour, where the story's owner is, of the evening before it is due.</summary>
    public const int StoryHour = 18;

    /// <summary>How long before its end a Popkin's members hear that it wraps up.</summary>
    public static readonly TimeSpan WrapUpLead = TimeSpan.FromHours(24);

    /// <summary>
    /// The moment a story due on `dueOn` reminds its owner: 18:00 the day before, where they are,
    /// and until the due day begins there.
    /// </summary>
    public static (DateTimeOffset From, DateTimeOffset Until) StoryDueWindow(DateOnly dueOn, TimeZoneInfo zone) =>
        (Local(dueOn.AddDays(-1).ToDateTime(new TimeOnly(StoryHour, 0)), zone), Local(dueOn.ToDateTime(TimeOnly.MinValue), zone));

    /// <summary>
    /// The 24 hours before a Popkin's end, or none: a Popkin that keeps going has no end, and one
    /// that started inside its last 24 hours is told nothing (send-reminders, "A short Popkin").
    /// </summary>
    public static (DateTimeOffset From, DateTimeOffset Until)? WrapUpWindow(DateTimeOffset? endsAt, DateTimeOffset createdAt) =>
        endsAt is { } end && createdAt <= end - WrapUpLead ? (end - WrapUpLead, end) : null;

    private static DateTimeOffset Local(DateTime local, TimeZoneInfo zone)
    {
        // A time skipped by a clock change is read as the hour after it.
        while (zone.IsInvalidTime(local))
        {
            local = local.AddHours(1);
        }

        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), zone), TimeSpan.Zero);
    }
}
