namespace Popkin.Domain;

/// <summary>
/// One member's rating of one experience, from one to five stars (L2-039). A member holds at
/// most one per experience: the experience and the member are its key.
/// </summary>
public sealed class ExperienceRating
{
    public const int MinStars = 1;

    public const int MaxStars = 5;

    /// <summary>A comment is at most 500 characters (L2-041 AC2).</summary>
    public const int MaxCommentLength = 500;

    private ExperienceRating()
    {
    }

    public Guid ExperienceId { get; private set; }

    public Guid MembershipId { get; private set; }

    public int Stars { get; private set; }

    public DateTimeOffset RatedAt { get; private set; }

    /// <summary>The few words the member added to their rating; null when they added none (L2-041).</summary>
    public string? Comment { get; private set; }

    /// <summary>When the comment was last written; what people said is ordered by it.</summary>
    public DateTimeOffset? CommentedAt { get; private set; }

    /// <summary>Adds the member's words to their rating, or replaces the ones they had (L2-041 AC3, AC4).</summary>
    public void SetComment(string text, DateTimeOffset now)
    {
        Comment = text;
        CommentedAt = now;
    }

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
