// Traces to: L2-146 AC6, L2-147 AC2, AC3, AC5, L2-148 AC4, known gaps 108 and 116 (ruled)
// Description: A group's emoji follows its kind, people join once, it is linked as the rulings say, and its name, note and kind are checked against the design's tables.
using Popkin.Application.Contacts.Groups;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

public sealed class ContactGroupTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 8, 40, 0, TimeSpan.Zero);

    private static ContactGroup Group(params Guid[] people) =>
        ContactGroup.Make(Guid.NewGuid(), "Sheffield lot", GroupKind.SmallGroup, null, people, Guid.NewGuid(), Now);

    // Kind | Emoji
    [Theory]
    [InlineData(GroupKind.Household, "🏡")]
    [InlineData(GroupKind.SmallGroup, "🕯️")]
    [InlineData(GroupKind.Team, "🤝")]
    [InlineData(GroupKind.Club, "⭐")]
    public void The_emoji_follows_the_kind(GroupKind kind, string emoji) =>
        Assert.Equal(emoji, ContactGroup.EmojiOf(kind));

    [Fact]
    public void A_person_joins_once()
    {
        var grace = Guid.NewGuid();
        var ben = Guid.NewGuid();
        var group = Group(grace, grace);

        group.Add([grace, ben], Now);

        Assert.Equal([grace, ben], group.Members.Select(m => m.ContactId));
    }

    // Linked to | Popkin asked | Still in the old one | Result
    [Theory]
    [InlineData(null, "A", false, "linked")]
    [InlineData("A", "A", true, "already")]
    [InlineData("A", "B", false, "linked")]
    [InlineData("A", "B", true, "refused")]
    public void A_group_is_linked_as_the_rulings_say(string? linkedTo, string asked, bool stillOpen, string result)
    {
        var ids = new Dictionary<string, Guid> { ["A"] = Guid.NewGuid(), ["B"] = Guid.NewGuid() };
        var group = Group();
        if (linkedTo is not null)
        {
            group.LinkTo(ids[linkedTo], false);
        }

        if (result == "refused")
        {
            Assert.Throws<InvalidOperationException>(() => group.LinkTo(ids[asked], stillOpen));
            return;
        }

        Assert.Equal(result == "linked", group.LinkTo(ids[asked], stillOpen));
        Assert.Equal(ids[asked], group.PopkinId);
    }

    // Name | Code
    [Theory]
    [InlineData(null, "name_required")]
    [InlineData("   ", "name_required")]
    [InlineData("1234567890123456789012345678901234567890X", "name_too_long")]
    public void A_name_is_given_and_kept_to_40_characters(string? name, string code) =>
        Assert.Equal(code, Assert.Throws<ProblemException>(() => GroupRules.Name(name)).Code);

    [Fact]
    public void A_name_of_40_is_kept_trimmed() =>
        Assert.Equal(new string('a', 40), GroupRules.Name($"  {new string('a', 40)} "));

    // Note | Kept
    [Theory]
    [InlineData(null, null)]
    [InlineData("  ", null)]
    [InlineData(" Thursdays 7:30 ", "Thursdays 7:30")]
    public void An_empty_note_is_none(string? note, string? kept) =>
        Assert.Equal(kept, GroupRules.Note(note));

    [Fact]
    public void A_note_is_kept_to_500_characters()
    {
        Assert.Equal(500, GroupRules.Note(new string('n', 500))!.Length);
        Assert.Equal("note_too_long", Assert.Throws<ProblemException>(() => GroupRules.Note(new string('n', 501))).Code);
    }

    // Kind | Allowed
    [Theory]
    [InlineData("Household", true)]
    [InlineData("SmallGroup", true)]
    [InlineData("Team", true)]
    [InlineData("Club", true)]
    [InlineData("household", false)]
    [InlineData("Choir", false)]
    [InlineData(null, false)]
    public void Only_the_four_kinds_are_offered(string? kind, bool allowed)
    {
        if (allowed)
        {
            Assert.Equal(kind, GroupRules.Kind(kind).ToString());
            return;
        }

        Assert.Equal("kind_not_allowed", Assert.Throws<ProblemException>(() => GroupRules.Kind(kind)).Code);
    }
}
