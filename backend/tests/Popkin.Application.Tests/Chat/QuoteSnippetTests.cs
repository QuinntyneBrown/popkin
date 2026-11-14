using Popkin.Application.Chat;

namespace Popkin.Application.Tests.Chat;

/// <summary>The snippet of a quote is the first line of the quoted text, at most 120 characters (L2-025 AC2).</summary>
public sealed class QuoteSnippetTests
{
    [Theory]
    [InlineData("Put me down", "Put me down")]
    [InlineData("First line\nSecond line", "First line")]
    [InlineData("First line\r\nSecond line", "First line")]
    public void A_snippet_is_the_first_line(string text, string snippet) =>
        Assert.Equal(snippet, QuoteDto.SnippetOf(text));

    [Theory]
    [InlineData(120, 120)]
    [InlineData(121, 120)]
    [InlineData(2000, 120)]
    public void A_snippet_is_at_most_120_characters(int length, int kept) =>
        Assert.Equal(new string('a', kept), QuoteDto.SnippetOf(new string('a', length)));

    [Fact]
    public void A_snippet_never_cuts_an_emoji_in_two()
    {
        var text = new string('a', 119) + "👍🏽 thanks";

        Assert.Equal(new string('a', 119), QuoteDto.SnippetOf(text));
    }
}
