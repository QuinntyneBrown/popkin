namespace Popkin.Domain;

/// <summary>The four columns of the plan board, in order (L2-068 AC3).</summary>
public enum StoryColumn
{
    Backlog,
    ToDo,
    Doing,
    Done,
}

/// <summary>The five tags of a story (L2-069 AC1).</summary>
public enum StoryTag
{
    Travel,
    Stay,
    Food,
    Money,
    Fun,
}

/// <summary>
/// One job someone can own (L2-068): a title, a column, points, a tag, an owner if anyone has
/// picked it up, and a due date if one was set. The rules of its fields are checked before.
/// </summary>
public sealed class Story
{
    /// <summary>A title is 1 to 80 characters once trimmed (L2-069 AC4).</summary>
    public const int MaxTitleLength = 80;

    /// <summary>The five sizes a story can be (L2-069 AC1).</summary>
    public static readonly IReadOnlyList<int> AllowedPoints = [1, 2, 3, 5, 8];

    private Story()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public string Title { get; private set; } = "";

    public StoryColumn Column { get; private set; }

    public int Points { get; private set; }

    public StoryTag Tag { get; private set; }

    /// <summary>The member on it; null when no one has picked it up.</summary>
    public Guid? OwnerMembershipId { get; private set; }

    public DateOnly? DueDate { get; private set; }

    /// <summary>The member who added it, who may delete it (L2-070 AC4).</summary>
    public Guid AddedByMembershipId { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }

    /// <summary>When it came into its column: a column lists its stories in that order, the newest last (L2-069 AC5).</summary>
    public DateTimeOffset PlacedAt { get; private set; }

    /// <summary>The points still to burn: those of a story in To do or Doing (L2-071 AC2).</summary>
    public int PointsLeft => Column is StoryColumn.ToDo or StoryColumn.Doing ? Points : 0;

    public static Story Add(
        Guid popkinId, string title, StoryColumn column, int points, StoryTag tag, Guid? ownerMembershipId, Guid addedByMembershipId, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            PopkinId = popkinId,
            Title = title,
            Column = column,
            Points = points,
            Tag = tag,
            OwnerMembershipId = ownerMembershipId,
            AddedByMembershipId = addedByMembershipId,
            AddedAt = now,
            PlacedAt = now,
        };

    /// <summary>Moves it to another column, last in it (L2-070 AC2).</summary>
    public void MoveTo(StoryColumn column, DateTimeOffset now)
    {
        if (column == Column)
        {
            return;
        }

        Column = column;
        PlacedAt = now;
    }

    /// <summary>Saves a change to its title, column, points, owner, tag or due date (L2-070 AC3).</summary>
    public void Change(string title, StoryColumn column, int points, StoryTag tag, Guid? ownerMembershipId, DateOnly? dueDate, DateTimeOffset now)
    {
        Title = title;
        Points = points;
        Tag = tag;
        OwnerMembershipId = ownerMembershipId;
        DueDate = dueDate;
        MoveTo(column, now);
    }
}
