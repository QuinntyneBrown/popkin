namespace Popkin.Domain;

public enum NotificationEmailKind
{
    Update,
    DailyDigest,
    WeeklyDigest,
    KeyDateReminder,
    StoryDue,
    WrapUp,
}

public enum OutgoingEmailStatus
{
    Open,
    Queued,
    Sending,
    Sent,
    Suppressed,
    Retrying,
    Dropped,
    Failed,
}

/// <summary>
/// One notification email to one person, the one shape every email design uses
/// (deliver-notifications). An update opens when its first change arrives and is due at
/// `SendAfter`; its unique `DedupKey` keeps it to one email however often a tick runs (L2-175 AC3).
/// </summary>
public sealed class OutgoingEmail
{
    private OutgoingEmail()
    {
    }

    public Guid Id { get; private set; }

    public Guid PersonId { get; private set; }

    public NotificationEmailKind Kind { get; private set; }

    public Guid? PopkinId { get; private set; }

    public string DedupKey { get; private set; } = "";

    public OutgoingEmailStatus Status { get; private set; }

    public SuppressionRule? SuppressedBy { get; private set; }

    public DateTimeOffset OpenedAt { get; private set; }

    public DateTimeOffset SendAfter { get; private set; }

    public int Attempts { get; private set; }

    public DateTimeOffset? NextAttemptAt { get; private set; }

    public DateTimeOffset? SentAt { get; private set; }

    public string? ProviderMessageId { get; private set; }

    /// <summary>A Popkin update whose window opens now and ends at `sendAfter` (L2-161 AC3).</summary>
    public static OutgoingEmail OpenUpdate(Guid personId, Guid popkinId, DateTimeOffset now, DateTimeOffset sendAfter)
    {
        var id = Guid.NewGuid();
        return new OutgoingEmail
        {
            Id = id,
            PersonId = personId,
            Kind = NotificationEmailKind.Update,
            PopkinId = popkinId,
            DedupKey = $"update:{id}",
            Status = OutgoingEmailStatus.Open,
            OpenedAt = now,
            SendAfter = sendAfter,
        };
    }

    /// <summary>An email that is complete when made (a digest, a reminder), due at `sendAfter`.</summary>
    public static OutgoingEmail Due(Guid personId, NotificationEmailKind kind, Guid? popkinId, string dedupKey, DateTimeOffset now, DateTimeOffset sendAfter) => new()
    {
        Id = Guid.NewGuid(),
        PersonId = personId,
        Kind = kind,
        PopkinId = popkinId,
        DedupKey = dedupKey,
        Status = OutgoingEmailStatus.Queued,
        OpenedAt = now,
        SendAfter = sendAfter,
    };

    /// <summary>Moved on to the end of quiet hours where the person is (L2-161 AC6).</summary>
    public void Defer(DateTimeOffset until) => SendAfter = until;

    /// <summary>Back to taking changes, until its new `SendAfter`.</summary>
    public void Reopen() => Status = Status == OutgoingEmailStatus.Queued ? OutgoingEmailStatus.Open : Status;

    /// <summary>The window has ended: nothing more joins it.</summary>
    public void Close() => Status = Status == OutgoingEmailStatus.Open ? OutgoingEmailStatus.Queued : Status;

    /// <summary>Held while member email is paused (L2-170 AC2).</summary>
    public void Queue() => Status = OutgoingEmailStatus.Queued;

    /// <summary>Saved before the provider is called, so a second tick never hands it over again.</summary>
    public void MarkSending() => Status = OutgoingEmailStatus.Sending;

    public void MarkSent(DateTimeOffset now, string? providerMessageId)
    {
        Status = OutgoingEmailStatus.Sent;
        SentAt = now;
        ProviderMessageId = providerMessageId;
        NextAttemptAt = null;
    }

    public void Suppress(SuppressionRule rule)
    {
        Status = OutgoingEmailStatus.Suppressed;
        SuppressedBy = rule;
    }

    /// <summary>A passing failure: tried again at `next` (L2-175 AC2).</summary>
    public void Retry(DateTimeOffset next)
    {
        Status = OutgoingEmailStatus.Retrying;
        Attempts++;
        NextAttemptAt = next;
    }

    /// <summary>A failure for good, or a passing one past six hours (L2-175 AC2).</summary>
    public void Fail()
    {
        Status = OutgoingEmailStatus.Failed;
        Attempts++;
        NextAttemptAt = null;
    }

    public void Drop()
    {
        Status = OutgoingEmailStatus.Dropped;
        NextAttemptAt = null;
    }
}
