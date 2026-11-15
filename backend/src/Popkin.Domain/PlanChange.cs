namespace Popkin.Domain;

/// <summary>
/// One change to a sprint's points left (L2-070 AC5, AC6): a story entering To do or Doing adds
/// its points, one leaving them for Backlog or Done or being deleted takes them off, and a change
/// of points in To do or Doing moves them by the difference. Its story is not a key, so the row
/// outlives a deleted story and the days before the delete still count it.
/// </summary>
public sealed class PlanChange
{
    private PlanChange()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public Guid StoryId { get; private set; }

    public DateTimeOffset At { get; private set; }

    public int Delta { get; private set; }

    public static PlanChange Of(Guid popkinId, Guid storyId, DateTimeOffset at, int delta) =>
        new() { Id = Guid.NewGuid(), PopkinId = popkinId, StoryId = storyId, At = at, Delta = delta };
}
