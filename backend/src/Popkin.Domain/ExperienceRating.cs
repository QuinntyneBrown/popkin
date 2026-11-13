namespace Popkin.Domain;

/// <summary>
/// One member's rating of one experience, from one to five stars (L2-039). A member holds at
/// most one per experience: the experience and the member are its key.
/// </summary>
public sealed class ExperienceRating
{
    public const int MinStars = 1;

    public const int MaxStars = 5;

    private ExperienceRating()
    {
    }

    public Guid ExperienceId { get; private set; }

    public Guid MembershipId { get; private set; }

    public int Stars { get; private set; }

    public DateTimeOffset RatedAt { get; private set; }

    public static bool IsInRange(int stars) => stars is >= MinStars and <= MaxStars;

    internal static ExperienceRating Give(Guid experienceId, Guid membershipId, int stars, DateTimeOffset now)
    {
        var rating = new ExperienceRating { ExperienceId = experienceId, MembershipId = membershipId };
        rating.ChangeStars(stars, now);
        return rating;
    }

    /// <summary>The member chooses another star: their rating changes and stays the one they have (L2-039 AC3).</summary>
    public void ChangeStars(int stars, DateTimeOffset now)
    {
        if (!IsInRange(stars))
        {
            throw new ArgumentOutOfRangeException(nameof(stars), stars, "A rating is one to five stars.");
        }

        Stars = stars;
        RatedAt = now;
    }
}
