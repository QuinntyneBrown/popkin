using Popkin.Application.Notifications.Emails;

namespace Popkin.Application.Tests.Notifications;

/// <summary>EmailText, one case per row of popkin-update-email's tests (L2-163 AC7).</summary>
public sealed class EmailTextTests
{
    [Fact]
    public void A_long_text_is_cut_at_300_characters_with_an_ellipsis()
    {
        var cut = EmailText.Cut(new string('a', 301), 300);

        Assert.Equal(new string('a', 300) + "…", cut);
    }

    [Fact]
    public void A_text_of_300_exactly_is_not_cut() =>
        Assert.Equal(new string('a', 300), EmailText.Cut(new string('a', 300), 300));

    // 299 letters, then a family emoji of several code units across the cut: kept whole.
    [Fact]
    public void An_emoji_across_the_cut_is_kept_whole()
    {
        var family = "👨‍👩‍👧";
        var cut = EmailText.Cut(new string('a', 299) + family + "bb", 300);

        Assert.Equal(new string('a', 299) + family + "…", cut);
    }

    [Fact]
    public void A_preheader_is_one_line_of_90_characters_at_most()
    {
        var preheader = EmailText.Preheader("First line\nsecond line " + new string('x', 100));

        Assert.DoesNotContain('\n', preheader);
        Assert.StartsWith("First line second line", preheader);
        Assert.True(preheader.Length <= 91, preheader);
        Assert.EndsWith("…", preheader);
    }

    [Theory]
    [InlineData("Walt Brennan", "Walt")]
    [InlineData("Cher", "Cher")]
    public void The_first_name_is_the_display_name_up_to_its_first_space(string name, string first) =>
        Assert.Equal(first, EmailText.FirstName(name));
}
