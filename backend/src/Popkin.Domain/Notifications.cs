namespace Popkin.Domain;

/// <summary>The twelve kinds of notification of L2-154, in the order of its table.</summary>
public enum NotificationKind
{
    MentionsAndReplies,
    DirectMessages,
    GroupChat,
    NewPhotos,
    PlanChanges,
    ScheduleChanges,
    PeopleJoining,
    Experiences,
    Birthdays,
    StoriesDue,
    PopkinWrappingUp,
    SignInAndSecurity,
}

/// <summary>"When something changes", "Reminders" and "Your account" (L2-154 AC3).</summary>
public enum NotificationGroup
{
    Activity,
    Reminders,
    Account,
}

public enum NotificationChannel
{
    Email,
    Phone,
}

/// <summary>How often activity email comes (L2-156 AC1).</summary>
public enum NotificationFrequency
{
    AsItHappens,
    DailyDigest,
    WeeklyDigest,
}

/// <summary>One kind as L2-154 names it, with its defaults and the feature that makes it, if any.</summary>
public sealed record NotificationCatalogueEntry(
    NotificationKind Kind,
    NotificationGroup Group,
    string Name,
    string About,
    bool EmailByDefault,
    bool PhoneByDefault,
    bool Required,
    Feature? Feature);

public sealed record NotificationGroupEntry(NotificationGroup Group, string Name, string About);

/// <summary>
/// The one list of notification kinds that the API, the Worker and both web apps read (L2-154).
/// The web apps get it with the settings and keep no copy.
/// </summary>
public static class NotificationCatalogue
{
    public static IReadOnlyList<NotificationGroupEntry> Groups { get; } =
    [
        new(NotificationGroup.Activity, "When something changes", "Anything new in a Popkin you’re in."),
        new(NotificationGroup.Reminders, "Reminders", "Nudges ahead of dates that matter."),
        new(NotificationGroup.Account, "Your account", "Always sent, so you can get back in."),
    ];

    public static IReadOnlyList<NotificationCatalogueEntry> All { get; } =
    [
        Activity(NotificationKind.MentionsAndReplies, "Mentions and replies", "Someone @mentions you or replies to you", true, true),
        Activity(NotificationKind.DirectMessages, "Direct messages", "A message just to you", true, true),
        Activity(NotificationKind.GroupChat, "Group chat", "New messages in a Popkin’s chat", false, true),
        Activity(NotificationKind.NewPhotos, "New photos", "Photos added to an album", true, false),
        Activity(NotificationKind.PlanChanges, "Plan changes", "Stories added, moved or given to you", true, true, Feature.Plan),
        Activity(NotificationKind.ScheduleChanges, "Schedule changes", "Someone books time off or the week shifts", true, false, Feature.Schedules),
        Activity(NotificationKind.PeopleJoining, "People joining", "Someone new joins a Popkin", true, false),
        Activity(NotificationKind.Experiences, "Experiences", "New places, ratings and comments", false, false),
        new(NotificationKind.Birthdays, NotificationGroup.Reminders, "Birthdays", "Birthdays, key dates, follow-ups and habits for your contacts", true, true, false, null),
        new(NotificationKind.StoriesDue, NotificationGroup.Reminders, "Stories due", "The day before a story you own is due", true, true, false, Feature.Plan),
        new(NotificationKind.PopkinWrappingUp, NotificationGroup.Reminders, "Popkin wrapping up", "24 hours before a Popkin wraps up", true, true, false, null),
        new(NotificationKind.SignInAndSecurity, NotificationGroup.Account, "Sign-in codes and security", "Codes, new devices and account changes", true, false, true, null),
    ];

    public static NotificationCatalogueEntry Of(NotificationKind kind) => All[(int)kind];

    private static NotificationCatalogueEntry Activity(
        NotificationKind kind, string name, string about, bool email, bool phone, Feature? feature = null) =>
        new(kind, NotificationGroup.Activity, name, about, email, phone, false, feature);
}

/// <summary>
/// A person's own notification settings (L2-156): whether activity email comes and how often.
/// The row is added on the person's first change; a null frequency follows the default.
/// </summary>
public sealed class NotificationPreferences
{
    private NotificationPreferences()
    {
    }

    public Guid PersonId { get; private set; }

    public bool EmailOn { get; private set; } = true;

    public NotificationFrequency? Frequency { get; private set; }

    public DateTimeOffset? UpdatedAt { get; private set; }

    public static NotificationPreferences For(Guid personId) => new() { PersonId = personId };

    public void TurnEmail(bool on, DateTimeOffset now)
    {
        EmailOn = on;
        UpdatedAt = now;
    }

    public void ChooseFrequency(NotificationFrequency frequency, DateTimeOffset now)
    {
        Frequency = frequency;
        UpdatedAt = now;
    }
}

/// <summary>
/// A person's own on or off for one kind (L2-157). A row exists only for a kind they changed, and
/// a null channel follows the default.
/// </summary>
public sealed class NotificationKindChoice
{
    private NotificationKindChoice()
    {
    }

    public Guid PersonId { get; private set; }

    public NotificationKind Kind { get; private set; }

    public bool? Email { get; private set; }

    public bool? Phone { get; private set; }

    public static NotificationKindChoice For(Guid personId, NotificationKind kind) => new() { PersonId = personId, Kind = kind };

    public bool? Of(NotificationChannel channel) => channel == NotificationChannel.Email ? Email : Phone;

    public void Choose(NotificationChannel channel, bool on)
    {
        if (channel == NotificationChannel.Email)
        {
            Email = on;
        }
        else
        {
            Phone = on;
        }
    }
}
