namespace Popkin.Domain;

/// <summary>How a conversation was had: "In person", "Phone", "Video" or "Messages" (L2-135).</summary>
public enum TalkChannel
{
    InPerson,
    Phone,
    Video,
    Messages,
}

/// <summary>
/// Something the person means to do for a contact, or for nobody yet (L1-034): its text, the day it
/// is due, and, for a promise made while logging a conversation, how and when it was promised.
/// Ticked done and opened again (L2-142); never edited (known gap 106, ruled).
/// </summary>
public sealed class FollowUp : IClientWrite
{
    public const int MaxTextLength = 200;

    private FollowUp()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    /// <summary>Who it is for; none for one added on Follow-ups (known gap 106, ruled).</summary>
    public Guid? ContactId { get; private set; }

    public string Text { get; private set; } = string.Empty;

    public DateOnly? DueOn { get; private set; }

    public bool IsPromise { get; private set; }

    public TalkChannel? PromisedVia { get; private set; }

    public DateOnly? PromisedOn { get; private set; }

    /// <summary>The conversation it was promised in, once Log keeps one.</summary>
    public Guid? TimelineEntryId { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? DoneAt { get; private set; }

    /// <summary>
    /// The text trimmed: 1 to <see cref="MaxTextLength"/> characters, or null for text that is
    /// blank, and the text itself when too long for the caller to refuse.
    /// </summary>
    public static string? Trimmed(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    public static FollowUp Add(
        Guid ownerId, Guid clientId, Guid? contactId, string text, DateOnly? dueOn, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Text = text,
            DueOn = dueOn,
            CreatedAt = now,
        };

    /// <summary>A promise said aloud to the contact while logging a conversation (L2-135 AC3).</summary>
    public static FollowUp Promise(
        Guid ownerId, Guid clientId, Guid contactId, string text, DateOnly? dueOn, TalkChannel via, DateOnly on, Guid? timelineEntryId, DateTimeOffset now)
    {
        var promise = Add(ownerId, clientId, contactId, text, dueOn, now);
        promise.IsPromise = true;
        promise.PromisedVia = via;
        promise.PromisedOn = on;
        promise.TimelineEntryId = timelineEntryId;
        return promise;
    }

    /// <summary>Done now; one already done keeps the day it was done.</summary>
    public void MarkDone(DateTimeOffset now) => DoneAt ??= now;

    public void MarkNotDone() => DoneAt = null;
}
