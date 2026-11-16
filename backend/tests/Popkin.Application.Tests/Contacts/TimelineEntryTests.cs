using Popkin.Application.Contacts.Timeline;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

/// <summary>A timeline entry's rules (L2-133, L2-134, L2-135, known gap 106 ruled), one case per row.</summary>
public sealed class TimelineEntryTests
{
    private static readonly DateTimeOffset Morning = new(2026, 9, 15, 8, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(MilestoneKind.NewJob, "Chidi’s work anniversary")]
    [InlineData(MilestoneKind.Wedding, "Chidi’s wedding anniversary")]
    [InlineData(MilestoneKind.NewBaby, "Chidi’s baby’s birthday")]
    [InlineData(MilestoneKind.Moved, "Chidi’s move anniversary")]
    [InlineData(MilestoneKind.Graduated, "Chidi’s graduation anniversary")]
    [InlineData(MilestoneKind.SomethingElse, "Ran his first marathon")]
    public void A_yearly_milestone_is_titled_by_its_kind(MilestoneKind kind, string title) =>
        Assert.Equal(title, TimelineEntry.YearlyTitle(kind, "Chidi", "Ran his first marathon"));

    [Theory]
    [InlineData(TimelineShow.All, new[] { TimelineEntryKind.Conversation, TimelineEntryKind.Milestone })]
    [InlineData(TimelineShow.Conversations, new[] { TimelineEntryKind.Conversation })]
    [InlineData(TimelineShow.Milestones, new[] { TimelineEntryKind.Milestone })]
    public void The_timeline_shows_by_kind(TimelineShow show, TimelineEntryKind[] kinds)
    {
        var owner = Guid.NewGuid();
        var contact = Guid.NewGuid();
        var entries = new[]
        {
            TimelineEntry.LogConversation(owner, Guid.NewGuid(), contact, TalkChannel.Phone, new DateOnly(2026, 9, 6), "Arup", Morning),
            TimelineEntry.LogMilestone(owner, Guid.NewGuid(), contact, MilestoneKind.NewJob, "Arup", new DateOnly(2026, 8, 31), null, Morning),
        };

        Assert.Equal(kinds, GetContactTimelineQueryHandler.Filter(entries, show).Select(e => e.Kind));
    }

    [Theory]
    [InlineData(null, "note_required")]
    [InlineData("   ", "note_required")]
    public void A_conversation_needs_a_note(string? note, string code) =>
        Assert.Equal(code, Assert.Throws<ProblemException>(() => TimelineRules.Note(note)).Code);

    [Fact]
    public void A_note_is_at_most_2000_characters()
    {
        Assert.Equal(2000, TimelineRules.Note(new string('a', 2000)).Length);
        Assert.Equal("note_too_long", Assert.Throws<ProblemException>(() => TimelineRules.Note(new string('a', 2001))).Code);
    }

    [Theory]
    [InlineData(" ", "2026-09-17", "promise_text_required")]
    [InlineData("Send the checklist", null, "promise_due_required")]
    [InlineData("Send the checklist", "Thursday", "due_not_valid")]
    public void A_promise_needs_its_words_and_its_day(string text, string? dueOn, string code) =>
        Assert.Equal(code, Assert.Throws<ProblemException>(() => TimelineRules.Promises([new PromiseDraft(text, dueOn)])).Code);

    [Theory]
    [InlineData(null, "title_required")]
    [InlineData("", "title_required")]
    public void A_milestone_needs_what_happened(string? title, string code) =>
        Assert.Equal(code, Assert.Throws<ProblemException>(() => TimelineRules.Title(title)).Code);

    [Theory]
    [InlineData(null)]
    [InlineData("31 August")]
    public void A_milestone_needs_its_day(string? day) =>
        Assert.Equal("happened_on_required", Assert.Throws<ProblemException>(() => TimelineRules.HappenedOn(day)).Code);
}
