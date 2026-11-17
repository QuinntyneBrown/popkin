namespace Popkin.Domain;

/// <summary>A turn in a contact's life (L2-134 AC1); SomethingElse is "Something else".</summary>
public enum MilestoneKind
{
    NewJob,
    Wedding,
    NewBaby,
    Moved,
    Graduated,
    SomethingElse,
}

public enum TimelineEntryKind
{
    Conversation,
    Milestone,
}

/// <summary>
/// A conversation or a milestone logged about one contact (L1-032): its day, how they talked or
/// what kind of turn it was, a milestone's title, and a note. Never edited (known gap 106, ruled);
/// it goes with its contact.
/// </summary>
public sealed class TimelineEntry : IClientWrite
{
    public const int MaxNoteLength = 2000;
    public const int MaxTitleLength = 200;

    private TimelineEntry()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public Guid ContactId { get; private set; }

    public TimelineEntryKind Kind { get; private set; }

    public TalkChannel? Channel { get; private set; }

    public MilestoneKind? MilestoneKind { get; private set; }

    /// <summary>The day it happened: a conversation's on the owner's clock, a milestone's "When".</summary>
    public DateOnly Day { get; private set; }

    public string? Title { get; private set; }

    public string? Note { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static TimelineEntry LogConversation(
        Guid ownerId, Guid clientId, Guid contactId, TalkChannel channel, DateOnly day, string note, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = TimelineEntryKind.Conversation,
            Channel = channel,
            Day = day,
            Note = note,
            CreatedAt = now,
        };

    public static TimelineEntry LogMilestone(
        Guid ownerId, Guid clientId, Guid contactId, MilestoneKind kind, string title, DateOnly day, string? note, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = TimelineEntryKind.Milestone,
            MilestoneKind = kind,
            Title = title,
            Day = day,
            Note = note,
            CreatedAt = now,
        };

    /// <summary>
    /// The title of the yearly key date a milestone adds (known gap 106, ruled): "Chidi’s work
    /// anniversary", and for Something else the milestone's own words.
    /// </summary>
    public static string YearlyTitle(MilestoneKind kind, string firstName, string title) => kind switch
    {
        Domain.MilestoneKind.NewJob => $"{firstName}’s work anniversary",
        Domain.MilestoneKind.Wedding => $"{firstName}’s wedding anniversary",
        Domain.MilestoneKind.NewBaby => $"{firstName}’s baby’s birthday",
        Domain.MilestoneKind.Moved => $"{firstName}’s move anniversary",
        Domain.MilestoneKind.Graduated => $"{firstName}’s graduation anniversary",
        _ => title,
    };
}
