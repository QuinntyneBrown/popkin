namespace Popkin.Domain;

/// <summary>
/// The group's score of an experience, from the count of ratings per star value: the number of
/// ratings and their average to one decimal (L2-037 AC2, L2-038 AC2).
/// </summary>
public sealed class ExperienceScore
{
    public static readonly ExperienceScore None = Of([]);

    private readonly int[] _counts = new int[ExperienceRating.MaxStars + 1];

    private ExperienceScore()
    {
    }

    /// <summary>The number of ratings.</summary>
    public int Count { get; private init; }

    /// <summary>The average to one decimal, halfway rounding up; null when nobody has rated (L2-038 AC5).</summary>
    public double? Average { get; private init; }

    /// <summary>How many members gave this many stars.</summary>
    public int CountFor(int stars) => _counts[stars];

    /// <summary>The score of the counts given; a star value that is not given was chosen by nobody.</summary>
    public static ExperienceScore Of(IEnumerable<(int Stars, int Count)> counts)
    {
        var perStar = new int[ExperienceRating.MaxStars + 1];
        foreach (var (stars, count) in counts)
        {
            perStar[stars] += count;
        }

        var total = perStar.Sum();
        var sum = perStar.Select((count, stars) => stars * count).Sum();
        var score = new ExperienceScore
        {
            Count = total,
            // Decimal, so that halfway is exactly halfway: 4.25 is 4.3.
            Average = total == 0 ? null : (double)Math.Round((decimal)sum / total, 1, MidpointRounding.AwayFromZero),
        };
        perStar.CopyTo(score._counts, 0);
        return score;
    }
}
