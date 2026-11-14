using Popkin.Application.Chat;
using Popkin.Application.Problems;

namespace Popkin.Application.Tests.Chat;

/// <summary>
/// A reaction is one emoji: one extended grapheme cluster of at most 32 UTF-16 units, made of
/// emoji code points with the joiners and modifiers emoji use; anything else is 400
/// `reaction_invalid` (L2-024, L2-052 AC1).
/// </summary>
public sealed class ReactionValidatorTests
{
    /// <summary>Eleven people joined by ZWJ: one grapheme cluster of 32 UTF-16 units.</summary>
    private static readonly string ThirtyTwoUnits = string.Join("‍", Enumerable.Repeat("👨", 11));

    [Theory]
    [InlineData("❤️")] // a symbol with VS16
    [InlineData("👍🏽")] // a skin tone
    [InlineData("👨‍👩‍👧")] // a ZWJ sequence
    [InlineData("1️⃣")] // a keycap
    [InlineData("🥞")]
    [InlineData("☕")] // a symbol with no VS16
    [InlineData("🇨🇦")] // a flag
    public void An_emoji_is_a_reaction(string emoji) =>
        Assert.Equal(emoji, ReactionValidator.Require(emoji));

    [Fact]
    public void An_emoji_of_32_units_is_a_reaction() =>
        Assert.Equal(ThirtyTwoUnits, ReactionValidator.Require(ThirtyTwoUnits));

    [Theory]
    [InlineData("a")] // a letter
    [InlineData("1")] // a digit that is no keycap
    [InlineData("❤️❤️")] // two emoji
    [InlineData("")] // nothing
    [InlineData(null)]
    [InlineData("<b>")] // markup
    [InlineData("❤️ ")] // an emoji with a space
    public void Anything_else_is_refused(string? emoji) => AssertRefused(emoji);

    [Fact]
    public void An_emoji_of_33_units_is_refused()
    {
        var thirtyThree = ThirtyTwoUnits + "️";
        Assert.Equal(33, thirtyThree.Length);
        AssertRefused(thirtyThree);
    }

    private static void AssertRefused(string? emoji)
    {
        var refusal = Assert.Throws<ProblemException>(() => ReactionValidator.Require(emoji));
        Assert.Equal(400, refusal.Status);
        Assert.Equal("reaction_invalid", refusal.Code);
        Assert.Equal("emoji", refusal.Field);
    }
}
