namespace Popkin.Domain;

/// <summary>
/// One member's interest in one thing the group wants to do (L2-042). A member is keen or not,
/// never more than once: the experience and the member are its key.
/// </summary>
public sealed class ExperienceKeen
{
    private ExperienceKeen()
    {
    }

    public Guid ExperienceId { get; private set; }

    public Guid MembershipId { get; private set; }

    /// <summary>When the member said so; who is keen is shown the earliest first.</summary>
    public DateTimeOffset At { get; private set; }

    internal static ExperienceKeen Say(Guid experienceId, Guid membershipId, DateTimeOffset now) =>
        new() { ExperienceId = experienceId, MembershipId = membershipId, At = now };
}
