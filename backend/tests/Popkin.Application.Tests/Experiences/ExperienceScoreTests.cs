using Popkin.Domain;

namespace Popkin.Application.Tests.Experiences;

/// <summary>The group's score of an experience: the average to one decimal, the number of ratings and the count per star (L2-037 AC2, L2-038 AC2, AC5).</summary>
public sealed class ExperienceScoreTests
{
    [Theory]
    // Nobody has rated it: no average.
    [InlineData(0, 0, 0, 0, 0, null, 0)]
    // One rating is the average.
    [InlineData(1, 0, 0, 0, 0, 5.0, 1)]
    [InlineData(0, 0, 1, 0, 0, 3.0, 1)]
    [InlineData(0, 0, 0, 0, 1, 1.0, 1)]
    // Everyone agrees.
    [InlineData(7, 0, 0, 0, 0, 5.0, 7)]
    // An average that is exact to one decimal.
    [InlineData(1, 1, 0, 0, 0, 4.5, 2)]
    [InlineData(1, 1, 1, 1, 1, 3.0, 5)]
    [InlineData(1, 0, 0, 0, 7, 1.5, 8)]
    // Rounded to the nearest decimal: 52 / 11 = 4.727, 14 / 3 = 4.667, 13 / 3 = 4.333.
    [InlineData(9, 1, 1, 0, 0, 4.7, 11)]
    [InlineData(2, 1, 0, 0, 0, 4.7, 3)]
    [InlineData(1, 2, 0, 0, 0, 4.3, 3)]
    // Halfway rounds up: 4.25, 3.75, 3.25, 1.25, 4.95.
    [InlineData(1, 3, 0, 0, 0, 4.3, 4)]
    [InlineData(0, 3, 1, 0, 0, 3.8, 4)]
    [InlineData(0, 1, 3, 0, 0, 3.3, 4)]
    [InlineData(1, 0, 0, 1, 18, 1.3, 20)]
    [InlineData(19, 1, 0, 0, 0, 5.0, 20)]
    public void The_average_is_to_one_decimal(int five, int four, int three, int two, int one, double? average, int count)
    {
        var score = ExperienceScore.Of([(5, five), (4, four), (3, three), (2, two), (1, one)]);

        Assert.Equal(average, score.Average);
        Assert.Equal(count, score.Count);
    }

    [Theory]
    [InlineData(5, 9)]
    [InlineData(4, 1)]
    [InlineData(3, 0)]
    [InlineData(2, 2)]
    [InlineData(1, 0)]
    public void Each_star_value_has_its_count_and_a_value_nobody_gave_has_none(int stars, int count)
    {
        // Only the values someone gave are counted by the database.
        var score = ExperienceScore.Of([(2, 2), (5, 9), (4, 1)]);

        Assert.Equal(count, score.CountFor(stars));
        Assert.Equal(12, score.Count);
    }

    [Fact]
    public void No_ratings_is_a_score_of_none()
    {
        Assert.Null(ExperienceScore.None.Average);
        Assert.Equal(0, ExperienceScore.None.Count);
        Assert.All([1, 2, 3, 4, 5], stars => Assert.Equal(0, ExperienceScore.None.CountFor(stars)));
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(2, true)]
    [InlineData(3, true)]
    [InlineData(4, true)]
    [InlineData(5, true)]
    [InlineData(0, false)]
    [InlineData(6, false)]
    [InlineData(-1, false)]
    [InlineData(int.MaxValue, false)]
    public void A_rating_is_one_to_five_stars(int stars, bool allowed)
    {
        Assert.Equal(allowed, ExperienceRating.IsInRange(stars));
    }
}
