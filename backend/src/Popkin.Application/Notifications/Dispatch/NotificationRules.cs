using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// Everything the rules need to know about one delivery, read by the dispatcher at fan-out and
/// again at send time (L2-174 AC1). Each flag defaults to the case that lets it through.
/// </summary>
public sealed record NotificationQuestion(NotificationKind Kind, NotificationChannel Channel, DateTimeOffset Now, TimeZoneInfo Zone)
{
    public bool RecipientIsActor { get; init; }

    public bool RecipientIsActiveMember { get; init; } = true;

    public bool PopkinWrappedUp { get; init; }

    /// <summary>The kind's feature (Plan, Schedules) is off for the Popkin.</summary>
    public bool FeatureOff { get; init; }

    public bool HasAddress { get; init; } = true;

    public bool HasDevice { get; init; } = true;

    public bool EmailPaused { get; init; }

    public bool KindOffForEveryone { get; init; }

    /// <summary>The Popkin or the person is held, suspended or being deleted (L2-172).</summary>
    public bool Held { get; init; }

    /// <summary>The person's "Email" switch (L2-156).</summary>
    public bool EmailOn { get; init; } = true;

    public bool ActorMuted { get; init; }

    public PopkinNotificationLevel Level { get; init; } = PopkinNotificationLevel.Everything;

    /// <summary>The event names this person (a reply's author, a story's new owner).</summary>
    public bool RecipientIsNamed { get; init; }

    /// <summary>The person's switch for the kind and channel, after the default is applied.</summary>
    public bool SwitchOn { get; init; } = true;

    public QuietHours QuietHours { get; init; } = QuietHours.Default;

    /// <summary>How the person takes activity email; the rules do not read it, the bundling does.</summary>
    public NotificationFrequency Frequency { get; init; } = NotificationFrequency.AsItHappens;
}

public enum NotificationOutcome
{
    Send,
    Queue,
    Suppress,
}

/// <summary>Send at a time, hold while email is paused, or stop with the rule that applied.</summary>
public readonly record struct NotificationDecision(NotificationOutcome Outcome, DateTimeOffset At, SuppressionRule? Rule)
{
    public bool Sends => Outcome == NotificationOutcome.Send;

    public static NotificationDecision SendAt(DateTimeOffset at) => new(NotificationOutcome.Send, at, null);

    public static NotificationDecision Queue(DateTimeOffset now) => new(NotificationOutcome.Queue, now, null);

    public static NotificationDecision Suppress(SuppressionRule rule, DateTimeOffset now) => new(NotificationOutcome.Suppress, now, rule);
}

/// <summary>
/// Whether and when a notification is sent (L2-161 AC1): the first rule that applies stops it, in
/// the order of the rules table in deliver-notifications. Pure: it reads no database and no clock.
/// </summary>
public static class NotificationRules
{
    /// <summary>The kinds "Just for me" leaves out unless the event names the person (L2-158 AC2).</summary>
    /// <summary>
    /// What a Popkin's level lets through (popkin-levels, "What each level lets through"): a plan
    /// change is for the person when it gives them a story. A level only narrows.
    /// </summary>
    public static bool LevelAllows(PopkinNotificationLevel level, NotificationKind kind, bool isForThePerson) => level switch
    {
        PopkinNotificationLevel.Muted => NotificationCatalogue.Of(kind).Group != NotificationGroup.Activity,
        PopkinNotificationLevel.JustForMe => !NotJustForMe.Contains(kind) || (kind == NotificationKind.PlanChanges && isForThePerson),
        _ => true,
    };

    /// <summary>The recipient muted whoever made the change; a reminder has no actor (L2-160 AC3).</summary>
    public static bool ActorMuted(IReadOnlyCollection<Guid> recipientMutes, Guid? actorPersonId) =>
        actorPersonId is { } actor && recipientMutes.Contains(actor);

    private static readonly HashSet<NotificationKind> NotJustForMe =
    [
        NotificationKind.GroupChat,
        NotificationKind.NewPhotos,
        NotificationKind.ScheduleChanges,
        NotificationKind.PeopleJoining,
        NotificationKind.Experiences,
        NotificationKind.PlanChanges,
    ];

    public static NotificationDecision Decide(NotificationQuestion q)
    {
        var email = q.Channel == NotificationChannel.Email;
        var entry = NotificationCatalogue.Of(q.Kind);
        SuppressionRule? rule =
            q.RecipientIsActor ? SuppressionRule.OwnAction
            : !q.RecipientIsActiveMember ? SuppressionRule.NotAMember
            : q.PopkinWrappedUp ? SuppressionRule.WrappedUp
            : entry.Feature is not null && q.FeatureOff ? SuppressionRule.FeatureOff
            : email && !q.HasAddress ? SuppressionRule.NoAddress
            : !email && !q.HasDevice ? SuppressionRule.NoDevice
            : null;
        if (rule is { } early)
        {
            return NotificationDecision.Suppress(early, q.Now);
        }

        if (email && q.EmailPaused)
        {
            return NotificationDecision.Queue(q.Now);
        }

        rule =
            q.KindOffForEveryone ? SuppressionRule.KindOffForEveryone
            : q.Held ? SuppressionRule.Held
            : email && !q.EmailOn ? SuppressionRule.Unsubscribed
            : q.ActorMuted ? SuppressionRule.MutedPerson
            : !LevelAllows(q.Level, q.Kind, q.RecipientIsNamed)
                ? q.Level == PopkinNotificationLevel.Muted ? SuppressionRule.PopkinMuted : SuppressionRule.JustForMe
            : !q.SwitchOn ? SuppressionRule.KindSwitchedOff
            : null;
        if (rule is { } late)
        {
            return NotificationDecision.Suppress(late, q.Now);
        }

        // A reminder keeps its own time: quiet hours do not hold it (L2-161 AC6, L2-162).
        return entry.Group != NotificationGroup.Reminders && q.QuietHours.Contains(LocalClock.TimeAt(q.Now, q.Zone))
            ? NotificationDecision.SendAt(q.QuietHours.EndAfter(q.Now, q.Zone))
            : NotificationDecision.SendAt(q.Now);
    }
}
