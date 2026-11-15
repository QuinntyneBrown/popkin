using Popkin.Application.Administration;
using Popkin.Application.Problems;

namespace Popkin.Application.Tests.Administration;

/// <summary>The reason an admin gives for a change (L2-087 AC2, AC3, AC6), one case per row.</summary>
public sealed class ReasonRulesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_required_reason_that_is_blank_is_refused(string? reason) =>
        Assert.Equal("reason_required", Assert.Throws<ProblemException>(() => ReasonRules.Required(reason)).Code);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_blank_optional_reason_is_none(string? reason) => Assert.Null(ReasonRules.Optional(reason));

    [Theory]
    [InlineData("x", "x")]
    [InlineData("  Asked by the Host  ", "Asked by the Host")]
    public void A_reason_is_kept_trimmed(string reason, string kept)
    {
        Assert.Equal(kept, ReasonRules.Required(reason));
        Assert.Equal(kept, ReasonRules.Optional(reason));
    }

    [Fact]
    public void Five_hundred_characters_are_accepted_and_one_more_is_not()
    {
        Assert.Equal(500, ReasonRules.Required(new string('a', 500)).Length);
        Assert.Equal("reason_too_long", Assert.Throws<ProblemException>(() => ReasonRules.Required(new string('a', 501))).Code);
        Assert.Equal("reason_too_long", Assert.Throws<ProblemException>(() => ReasonRules.Optional(new string('a', 501))).Code);
    }
}
