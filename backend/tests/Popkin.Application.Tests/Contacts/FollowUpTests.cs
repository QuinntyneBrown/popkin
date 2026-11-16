using Popkin.Application.Contacts.FollowUps;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

/// <summary>A follow-up's rules (L2-142, known gap 106 ruled), one case per row.</summary>
public sealed class FollowUpTests
{
    private static readonly DateTimeOffset Morning = new(2026, 9, 15, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Done_keeps_the_day_it_was_first_done_and_not_done_opens_it()
    {
        var followUp = FollowUp.Add(Guid.NewGuid(), Guid.NewGuid(), null, "Call Sam", null, Morning);

        followUp.MarkDone(Morning);
        followUp.MarkDone(Morning.AddDays(1));
        Assert.Equal(Morning, followUp.DoneAt);

        followUp.MarkNotDone();
        Assert.Null(followUp.DoneAt);
    }

    [Fact]
    public void A_promise_keeps_how_and_when_it_was_promised()
    {
        var promise = FollowUp.Promise(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), "Return the ladder", null, TalkChannel.InPerson, new DateOnly(2026, 9, 12), null, Morning);

        Assert.True(promise.IsPromise);
        Assert.Equal(TalkChannel.InPerson, promise.PromisedVia);
        Assert.Equal(new DateOnly(2026, 9, 12), promise.PromisedOn);
    }

    [Theory]
    [InlineData("  Call Sam  ", "Call Sam", null)]
    [InlineData("", null, "text_required")]
    [InlineData("   ", null, "text_required")]
    [InlineData(null, null, "text_required")]
    [InlineData("200", "200", null)]
    [InlineData("201", null, "text_too_long")]
    public void Text_is_trimmed_and_1_to_200_characters(string? text, string? kept, string? code)
    {
        var typed = text is "200" or "201" ? new string('a', int.Parse(text)) : text;
        var expected = kept == "200" ? new string('a', 200) : kept;

        if (code is null)
        {
            Assert.Equal(expected, FollowUpRules.Text(typed));
        }
        else
        {
            Assert.Equal(code, Assert.Throws<ProblemException>(() => FollowUpRules.Text(typed)).Code);
        }
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("2026-09-20", "2026-09-20")]
    public void The_due_day_is_a_day_or_none(string? dueOn, string? day) =>
        Assert.Equal(day is null ? null : DateOnly.Parse(day), FollowUpRules.Due(dueOn));

    [Theory]
    [InlineData("2026-02-30")]
    [InlineData("20 Sep")]
    public void A_due_day_not_in_the_calendar_is_refused(string dueOn) =>
        Assert.Equal("due_not_valid", Assert.Throws<ProblemException>(() => FollowUpRules.Due(dueOn)).Code);
}
