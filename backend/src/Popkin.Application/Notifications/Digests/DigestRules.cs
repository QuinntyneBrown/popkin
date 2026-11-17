using Popkin.Domain;

namespace Popkin.Application.Notifications.Digests;

/// <summary>When a digest goes and what it shows, in what order (digest-emails, L2-165). Pure.</summary>
public static class DigestRules
{
    public const int Hour = 18;

    public const int LinesShown = 3;

    public const int PhotosShown = 4;

    public const int NeedsYouShown = 5;

    /// <summary>The card holds what falls today, tomorrow or the day after.</summary>
    public const int NeedsYouDays = 2;

    /// <summary>
    /// A person's digest is due from 6 pm where they are: every day, or on Sunday for the weekly.
    /// "As it happens" with held changes (the daily most) goes in the daily one (L2-161 AC4).
    /// </summary>
    public static bool IsDue(NotificationFrequency frequency, DateTimeOffset localNow) =>
        localNow.Hour >= Hour && (frequency != NotificationFrequency.WeeklyDigest || localNow.DayOfWeek == DayOfWeek.Sunday);

    public static NotificationEmailKind KindOf(NotificationFrequency frequency) =>
        frequency == NotificationFrequency.WeeklyDigest ? NotificationEmailKind.WeeklyDigest : NotificationEmailKind.DailyDigest;

    /// <summary>Since the previous digest, or the last 24 hours (7 days for the weekly) without one.</summary>
    public static DateTimeOffset PeriodStart(DateTimeOffset? previous, DateTimeOffset now, bool weekly) =>
        previous ?? now - (weekly ? TimeSpan.FromDays(7) : TimeSpan.FromDays(1));

    /// <summary>
    /// A line's place in its section: changes to the person, then plan, joining, photos, schedule
    /// and experiences, then the group chat.
    /// </summary>
    public static int LineRank(NotificationKind kind, bool forThePerson) => forThePerson ? 0 : kind switch
    {
        NotificationKind.PlanChanges => 1,
        NotificationKind.PeopleJoining => 2,
        NotificationKind.NewPhotos => 3,
        NotificationKind.ScheduleChanges => 4,
        NotificationKind.Experiences => 5,
        _ => 6,
    };

    /// <summary>Sections with the most changes first; a tie goes to the newest change.</summary>
    public static IEnumerable<T> OrderSections<T>(IEnumerable<T> sections, Func<T, int> count, Func<T, DateTimeOffset> newest) =>
        sections.OrderByDescending(count).ThenByDescending(newest);

    public static string Subject(bool weekly, int needsYou, int changes, int popkins)
    {
        var lead = weekly ? "Your week in Popkin" : "Your day in Popkin";
        return needsYou > 0
            ? $"{lead}: {NeedsYou(needsYou)}"
            : $"{lead}: {Count(changes, "new thing")} across {Count(popkins, "Popkin")}";
    }

    public static string NeedsYou(int n) => n == 1 ? "1 thing needs you" : $"{n} things need you";

    public static string PeriodLine(bool weekly) => weekly ? "Everything since last Sunday" : "Everything since 6 pm yesterday";

    public static string Reason(bool weekly) => weekly
        ? "You’re getting one digest a week, on Sunday at 6 pm, instead of an email per change. Reminders still arrive on time."
        : "You’re getting one digest a day at 6 pm instead of an email per change. Reminders still arrive on time.";

    /// <summary>"and 1 message in the chat", or none at nought.</summary>
    public static string? MoreMessages(int n) => n <= 0 ? null : $"and {Count(n, "message")} in the chat";

    private static string Count(int n, string one) => n == 1 ? $"1 {one}" : $"{n} {one}s";
}
