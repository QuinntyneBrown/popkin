using Popkin.Application.Experiences;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Experiences;

/// <summary>The rules the title, kind, when and place of an experience keep (L2-040 AC2, AC3, L2-052 AC1).</summary>
public sealed class ExperienceFieldsTests
{
    [Theory]
    // 1 to 80 characters, less the white space around them.
    [InlineData("a", 1, null)]
    [InlineData("Sunrise canoe to Heron Point", 28, null)]
    [InlineData("  Sunrise canoe  ", 13, null)]
    [InlineData("<b>Bonfire</b>", 14, null)]
    [InlineData(80, 80, null)]
    [InlineData(81, 0, "title_too_long")]
    [InlineData(500, 0, "title_too_long")]
    // Nothing, or white space only.
    [InlineData(null, 0, "title_required")]
    [InlineData("", 0, "title_required")]
    [InlineData("   ", 0, "title_required")]
    [InlineData("\t\n", 0, "title_required")]
    public void A_title_is_1_to_80_characters(object? given, int keptLength, string? refusal)
    {
        var title = Text(given);

        if (refusal is null)
        {
            Assert.Equal(keptLength, ExperienceFields.Title(title).Length);
            Assert.Equal(title!.Trim(), ExperienceFields.Title(title));
        }
        else
        {
            AssertRefused(() => ExperienceFields.Title(title), refusal, "title");
        }
    }

    [Fact]
    public void A_title_of_80_characters_with_white_space_around_it_is_kept()
    {
        Assert.Equal(80, ExperienceFields.Title($"  {new string('a', 80)}  ").Length);
    }

    [Theory]
    // 0 to 80 characters; none is null.
    [InlineData(null, null, null)]
    [InlineData("", null, null)]
    [InlineData("   ", null, null)]
    [InlineData("Heron Point, Lake Ossia", "Heron Point, Lake Ossia", null)]
    [InlineData("  Heron Point  ", "Heron Point", null)]
    [InlineData(80, 80, null)]
    [InlineData(81, null, "place_too_long")]
    public void A_place_is_at_most_80_characters(object? given, object? kept, string? refusal)
    {
        var place = Text(given);

        if (refusal is null)
        {
            Assert.Equal(Text(kept), ExperienceFields.Place(place));
        }
        else
        {
            AssertRefused(() => ExperienceFields.Place(place), refusal, "place");
        }
    }

    [Theory]
    // 0 to 40 characters; none is null.
    [InlineData(null, null, null)]
    [InlineData("", null, null)]
    [InlineData("   ", null, null)]
    [InlineData("Sat morning", "Sat morning", null)]
    [InlineData("  Sat night  ", "Sat night", null)]
    [InlineData(40, 40, null)]
    [InlineData(41, null, "when_too_long")]
    public void A_when_is_at_most_40_characters(object? given, object? kept, string? refusal)
    {
        var when = Text(given);

        if (refusal is null)
        {
            Assert.Equal(Text(kept), ExperienceFields.When(when));
        }
        else
        {
            AssertRefused(() => ExperienceFields.When(when), refusal, "when");
        }
    }

    [Theory]
    [InlineData("Did", ExperienceKind.Did)]
    [InlineData("Restaurant", ExperienceKind.Restaurant)]
    [InlineData("Want", ExperienceKind.Want)]
    public void A_kind_is_one_of_three(string given, ExperienceKind kind)
    {
        Assert.Equal(kind, ExperienceFields.Kind(given));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("did")]
    [InlineData("WantToDo")]
    [InlineData("Something we did")]
    [InlineData("0")]
    [InlineData("2")]
    [InlineData(" Did ")]
    public void Any_other_kind_is_refused(string? given)
    {
        AssertRefused(() => ExperienceFields.Kind(given), "invalid_kind", "kind");
    }

    [Theory]
    // 1 to 500 characters, less the white space around them (L2-041 AC2).
    [InlineData("a", 1, null)]
    [InlineData("Worth the 6 am alarm.", 21, null)]
    [InlineData("  Lovely.\n", 7, null)]
    [InlineData(500, 500, null)]
    [InlineData(501, 0, "comment_too_long")]
    [InlineData(5000, 0, "comment_too_long")]
    // Nothing, or white space only: a comment is not cleared.
    [InlineData(null, 0, "comment_required")]
    [InlineData("", 0, "comment_required")]
    [InlineData("  \n\t ", 0, "comment_required")]
    public void A_comment_is_1_to_500_characters(object? given, int keptLength, string? refusal)
    {
        var text = Text(given);

        if (refusal is null)
        {
            Assert.Equal(keptLength, ExperienceFields.Comment(text).Length);
        }
        else
        {
            AssertRefused(() => ExperienceFields.Comment(text), refusal, "text");
        }
    }

    /// <summary>A number stands for a text of that many characters.</summary>
    private static string? Text(object? given) => given is int length ? new string('a', length) : (string?)given;

    private static void AssertRefused(Action act, string code, string field)
    {
        var problem = Assert.Throws<ProblemException>(act);
        Assert.Equal((400, code, field), (problem.Status, problem.Code, problem.Field));
    }
}
