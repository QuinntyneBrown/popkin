namespace Popkin.Domain;

/// <summary>What a reminder is of (L2-140 AC1, L2-133 AC2, L2-145 AC4).</summary>
public enum ReminderKind
{
    KeyDate,
    FollowUp,
    Habit,
}

/// <summary>
/// One reminder of its owner's, added at 9 am on its day (docs/detailed-designs/contacts/reminders):
/// shown in Contacts until dismissed, and sent to the phone once. One per thing and day.
/// </summary>
public sealed class ContactReminder : IOwnedByPerson
{
    public const int MaxWordsLength = 240;

    private ContactReminder()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public ReminderKind Kind { get; private set; }

    /// <summary>The key date, follow-up or habit it reminds of.</summary>
    public Guid SubjectId { get; private set; }

    /// <summary>The contact its message opens; none for a follow-up for nobody.</summary>
    public Guid? ContactId { get; private set; }

    public DateOnly DueOn { get; private set; }

    /// <summary>"Grace turns 33 on Saturday".</summary>
    public string Words { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? NotifiedAt { get; private set; }

    public DateTimeOffset? DismissedAt { get; private set; }

    public static ContactReminder Add(
        Guid ownerId, ReminderKind kind, Guid subjectId, Guid? contactId, DateOnly dueOn, string words, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Kind = kind,
            SubjectId = subjectId,
            ContactId = contactId,
            DueOn = dueOn,
            Words = words.Length > MaxWordsLength ? words[..MaxWordsLength] : words,
            CreatedAt = now,
        };

    public void MarkNotified(DateTimeOffset now) => NotifiedAt ??= now;

    public void Dismiss(DateTimeOffset now) => DismissedAt ??= now;
}

/// <summary>The Monday email of one week, sent once (L2-140 AC3).</summary>
public sealed class ContactWeeklyEmail : IOwnedByPerson
{
    private ContactWeeklyEmail()
    {
    }

    public Guid OwnerId { get; private set; }

    /// <summary>The Monday the week starts on.</summary>
    public DateOnly WeekOf { get; private set; }

    public DateTimeOffset SentAt { get; private set; }

    public static ContactWeeklyEmail Sent(Guid ownerId, DateOnly weekOf, DateTimeOffset now) =>
        new() { OwnerId = ownerId, WeekOf = weekOf, SentAt = now };
}

/// <summary>A device that takes phone reminders by Web Push (ADR 0028): one per endpoint.</summary>
public sealed class PushSubscription
{
    public const int MaxEndpointLength = 1000;

    public const int MaxKeyLength = 200;

    private PushSubscription()
    {
    }

    public Guid Id { get; private set; }

    public Guid PersonId { get; private set; }

    public string Endpoint { get; private set; } = string.Empty;

    public string P256dh { get; private set; } = string.Empty;

    public string Auth { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    public static PushSubscription Subscribe(Guid personId, string endpoint, string p256dh, string auth, DateTimeOffset now) =>
        new() { Id = Guid.NewGuid(), PersonId = personId, Endpoint = endpoint, P256dh = p256dh, Auth = auth, CreatedAt = now };

    /// <summary>The same device subscribing again, maybe for someone else signed in on it.</summary>
    public void Renew(Guid personId, string p256dh, string auth)
    {
        PersonId = personId;
        P256dh = p256dh;
        Auth = auth;
    }
}
