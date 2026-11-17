namespace Popkin.Domain;

/// <summary>Who an event is for: the active members of its Popkin but the actor, or one person.</summary>
public enum NotificationAudience
{
    Members,
    Recipient,
}

/// <summary>
/// A change worth telling people about, written in the same save as the change (the outbox). It
/// holds ids, dates and enum values only, never text a member wrote (L2-174 AC3).
/// </summary>
public sealed class NotificationEvent
{
    private NotificationEvent()
    {
    }

    public Guid Id { get; private set; }

    public NotificationKind Kind { get; private set; }

    public NotificationAudience Audience { get; private set; }

    public Guid? PopkinId { get; private set; }

    public Guid? ActorPersonId { get; private set; }

    /// <summary>What the change is about: a message, a photo, a story, a membership...</summary>
    public Guid SubjectId { get; private set; }

    /// <summary>The one person the change is for, when it names one (a reply's author, a story's new owner).</summary>
    public Guid? RecipientPersonId { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    public DateTimeOffset? DispatchedAt { get; private set; }

    /// <summary>Set for an event a job may record twice (a reminder), so it is kept once.</summary>
    public string? DedupKey { get; private set; }

    /// <summary>A small JSON object of ids, dates and enum values the change alone knows.</summary>
    public string? Facts { get; private set; }

    public static NotificationEvent Record(
        NotificationKind kind,
        NotificationAudience audience,
        Guid? popkinId,
        Guid? actorPersonId,
        Guid subjectId,
        Guid? recipientPersonId,
        DateTimeOffset now,
        string? dedupKey = null,
        string? facts = null) => new()
    {
        Id = Guid.NewGuid(),
        Kind = kind,
        Audience = audience,
        PopkinId = popkinId,
        ActorPersonId = actorPersonId,
        SubjectId = subjectId,
        RecipientPersonId = recipientPersonId,
        OccurredAt = now,
        DedupKey = dedupKey,
        Facts = facts,
    };

    public void MarkDispatched(DateTimeOffset now) => DispatchedAt ??= now;
}

public enum NotificationDeliveryStatus
{
    Bundled,
    AwaitingDigest,
    Due,
    Sent,
    Suppressed,
    Retrying,
    Dropped,
    Failed,
}

/// <summary>The rule that stopped a delivery (deliver-notifications, "The rules").</summary>
public enum SuppressionRule
{
    OwnAction,
    NotAMember,
    WrappedUp,
    FeatureOff,
    NoAddress,
    NoDevice,
    KindOffForEveryone,
    Held,
    Unsubscribed,
    MutedPerson,
    PopkinMuted,
    JustForMe,
    KindSwitchedOff,
    Seen,
    NothingNew,
}

/// <summary>
/// One event for one person on one channel, and what became of it. Unique on (event, person,
/// channel), so a second tick over the same event adds nothing (L2-175 AC3).
/// </summary>
public sealed class NotificationDelivery
{
    private NotificationDelivery()
    {
    }

    public Guid Id { get; private set; }

    public Guid EventId { get; private set; }

    public Guid PersonId { get; private set; }

    public NotificationChannel Channel { get; private set; }

    public NotificationDeliveryStatus Status { get; private set; }

    public SuppressionRule? Rule { get; private set; }

    public Guid? OutgoingEmailId { get; private set; }

    public DateTimeOffset SendAfter { get; private set; }

    public int Attempts { get; private set; }

    public DateTimeOffset? NextAttemptAt { get; private set; }

    public DateTimeOffset? SentAt { get; private set; }

    public static NotificationDelivery Due(Guid eventId, Guid personId, NotificationChannel channel, DateTimeOffset sendAfter) => new()
    {
        Id = Guid.NewGuid(),
        EventId = eventId,
        PersonId = personId,
        Channel = channel,
        Status = NotificationDeliveryStatus.Due,
        SendAfter = sendAfter,
    };

    public static NotificationDelivery Suppressed(Guid eventId, Guid personId, NotificationChannel channel, SuppressionRule rule, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        EventId = eventId,
        PersonId = personId,
        Channel = channel,
        Status = NotificationDeliveryStatus.Suppressed,
        Rule = rule,
        SendAfter = now,
    };

    public static NotificationDelivery Bundled(Guid eventId, Guid personId, Guid outgoingEmailId, DateTimeOffset sendAfter) => new()
    {
        Id = Guid.NewGuid(),
        EventId = eventId,
        PersonId = personId,
        Channel = NotificationChannel.Email,
        Status = NotificationDeliveryStatus.Bundled,
        OutgoingEmailId = outgoingEmailId,
        SendAfter = sendAfter,
    };

    /// <summary>An email change that waits for the person's digest (L2-161 AC4, AC5).</summary>
    public static NotificationDelivery AwaitingDigest(Guid eventId, Guid personId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        EventId = eventId,
        PersonId = personId,
        Channel = NotificationChannel.Email,
        Status = NotificationDeliveryStatus.AwaitingDigest,
        SendAfter = now,
    };

    public void MarkSent(DateTimeOffset now)
    {
        Status = NotificationDeliveryStatus.Sent;
        SentAt = now;
        NextAttemptAt = null;
    }

    /// <summary>Stopped at the send-time recheck (L2-174 AC1).</summary>
    public void Suppress(SuppressionRule rule)
    {
        Status = NotificationDeliveryStatus.Suppressed;
        Rule = rule;
        NextAttemptAt = null;
    }
}

/// <summary>
/// The platform's notification controls, one row: the member email pause (L2-170) and the
/// defaults an Owner may change (L2-173). The admin app changes them; the dispatcher reads them on
/// every tick.
/// </summary>
public sealed class NotificationPlatform
{
    public static readonly Guid SingletonId = new("6b7c1d1e-4f0a-4c55-9d1e-2b8e0f6a0001");

    private NotificationPlatform()
    {
    }

    public Guid Id { get; private set; } = SingletonId;

    public DateTimeOffset? EmailPausedAt { get; private set; }

    public Guid? PausedByAdminId { get; private set; }

    public string? PauseReason { get; private set; }

    /// <summary>Minutes after a person's first pending change during which more join the email (L2-161 AC3).</summary>
    public int BundlingMinutes { get; private set; } = 10;

    /// <summary>Activity emails a person is sent at most in a day where they are (L2-161 AC4).</summary>
    public int DailyMost { get; private set; } = 12;

    public TimeOnly QuietFrom { get; private set; } = new(21, 0);

    public TimeOnly QuietUntil { get; private set; } = new(8, 0);

    /// <summary>The settings as they stand before any Owner changes them.</summary>
    public static NotificationPlatform Defaults() => new();

    public void PauseEmail(Guid adminId, string reason, DateTimeOffset now)
    {
        EmailPausedAt ??= now;
        PausedByAdminId = adminId;
        PauseReason = reason;
    }

    public void ResumeEmail()
    {
        EmailPausedAt = null;
        PausedByAdminId = null;
        PauseReason = null;
    }
}
