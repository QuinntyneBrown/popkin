using Popkin.Application.WrapUp;
using Popkin.Domain;

namespace Popkin.Application.Tests.WrapUp;

/// <summary>Which experience the recap names as the top-rated moment (L2-046 AC3), one case per row.</summary>
public sealed class TopRatedMomentTests
{
    private static readonly DateTimeOffset Saturday = new(2026, 9, 12, 9, 0, 0, TimeSpan.Zero);
    private static readonly Guid PopkinId = Guid.NewGuid();

    private static (Experience Experience, ExperienceScore Score) Moment(
        string title, int hoursLater, ExperienceKind kind = ExperienceKind.Did, params int[] stars) =>
        (Experience.Share(PopkinId, Guid.NewGuid(), kind, title, null, null, null, Saturday.AddHours(hoursLater)),
            ExperienceScore.Of(stars.Select(s => (s, 1))));

    [Fact]
    public void With_no_experience_there_is_none()
    {
        Assert.Null(TopRatedMoment.Pick([]));
    }

    [Fact]
    public void An_experience_nobody_rated_is_not_a_top_rated_moment()
    {
        Assert.Null(TopRatedMoment.Pick([Moment("Sunrise paddle", 0), Moment("Bonfire", 1)]));
    }

    [Fact]
    public void The_highest_average_wins()
    {
        var top = TopRatedMoment.Pick([Moment("Bonfire", 0, stars: [4, 4, 4]), Moment("Sunrise paddle", 1, stars: [5, 4])]);

        Assert.Equal("Sunrise paddle", top?.Experience.Title);
        Assert.Equal(4.5, top?.Score.Average);
    }

    [Fact]
    public void Of_two_with_the_same_average_the_one_more_members_rated_wins()
    {
        var top = TopRatedMoment.Pick([Moment("Bonfire", 0, stars: [5]), Moment("Sunrise paddle", 1, stars: [5, 5])]);

        Assert.Equal("Sunrise paddle", top?.Experience.Title);
    }

    [Fact]
    public void Of_two_with_the_same_average_and_ratings_the_one_shared_earlier_wins()
    {
        var top = TopRatedMoment.Pick([Moment("Sunrise paddle", 2, stars: [5, 4]), Moment("Bonfire", 1, stars: [4, 5])]);

        Assert.Equal("Bonfire", top?.Experience.Title);
    }

    [Fact]
    public void Averages_are_compared_as_they_are_shown_to_one_decimal()
    {
        // 4.33 and 4.25 both show as 4.3, so the one more members rated wins.
        var top = TopRatedMoment.Pick([Moment("Bonfire", 0, stars: [5, 4, 4]), Moment("Sunrise paddle", 1, stars: [5, 4, 4, 4])]);

        Assert.Equal("Sunrise paddle", top?.Experience.Title);
    }

    [Fact]
    public void Something_the_group_wants_to_do_is_never_the_top_rated_moment()
    {
        var top = TopRatedMoment.Pick([Moment("Go again next year", 0, ExperienceKind.Want, 5, 5), Moment("Bonfire", 1, stars: [3])]);

        Assert.Equal("Bonfire", top?.Experience.Title);
    }
}
