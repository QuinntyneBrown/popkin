// Traces to: L2-154 AC1, AC3
// Description: The catalogue holds the twelve kinds of L2-154, one row each, in its words and with its defaults.
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

public sealed class NotificationCatalogueTests
{
    // Kind | Group | Name | What sends it | Email | Phone | Required
    [Theory]
    [InlineData(NotificationKind.MentionsAndReplies, NotificationGroup.Activity, "Mentions and replies", "Someone @mentions you or replies to you", true, true, false)]
    [InlineData(NotificationKind.DirectMessages, NotificationGroup.Activity, "Direct messages", "A message just to you", true, true, false)]
    [InlineData(NotificationKind.GroupChat, NotificationGroup.Activity, "Group chat", "New messages in a Popkin’s chat", false, true, false)]
    [InlineData(NotificationKind.NewPhotos, NotificationGroup.Activity, "New photos", "Photos added to an album", true, false, false)]
    [InlineData(NotificationKind.PlanChanges, NotificationGroup.Activity, "Plan changes", "Stories added, moved or given to you", true, true, false)]
    [InlineData(NotificationKind.ScheduleChanges, NotificationGroup.Activity, "Schedule changes", "Someone books time off or the week shifts", true, false, false)]
    [InlineData(NotificationKind.PeopleJoining, NotificationGroup.Activity, "People joining", "Someone new joins a Popkin", true, false, false)]
    [InlineData(NotificationKind.Experiences, NotificationGroup.Activity, "Experiences", "New places, ratings and comments", false, false, false)]
    [InlineData(NotificationKind.Birthdays, NotificationGroup.Reminders, "Birthdays", "Birthdays, key dates, follow-ups and habits for your contacts", true, true, false)]
    [InlineData(NotificationKind.StoriesDue, NotificationGroup.Reminders, "Stories due", "The day before a story you own is due", true, true, false)]
    [InlineData(NotificationKind.PopkinWrappingUp, NotificationGroup.Reminders, "Popkin wrapping up", "24 hours before a Popkin wraps up", true, true, false)]
    [InlineData(NotificationKind.SignInAndSecurity, NotificationGroup.Account, "Sign-in codes and security", "Codes, new devices and account changes", true, false, true)]
    public void Each_kind_reads_as_its_row(
        NotificationKind kind, NotificationGroup group, string name, string about, bool email, bool phone, bool required)
    {
        var entry = NotificationCatalogue.Of(kind);

        Assert.Equal(kind, entry.Kind);
        Assert.Equal(group, entry.Group);
        Assert.Equal(name, entry.Name);
        Assert.Equal(about, entry.About);
        Assert.Equal(email, entry.EmailByDefault);
        Assert.Equal(phone, entry.PhoneByDefault);
        Assert.Equal(required, entry.Required);
    }

    [Fact]
    public void There_are_twelve_kinds_in_the_order_of_the_table()
    {
        Assert.Equal(Enum.GetValues<NotificationKind>(), NotificationCatalogue.All.Select(e => e.Kind));
    }

    // Group | Name | Sentence
    [Theory]
    [InlineData(NotificationGroup.Activity, "When something changes", "Anything new in a Popkin you’re in.")]
    [InlineData(NotificationGroup.Reminders, "Reminders", "Nudges ahead of dates that matter.")]
    [InlineData(NotificationGroup.Account, "Your account", "Always sent, so you can get back in.")]
    public void Each_group_reads_in_its_words(NotificationGroup group, string name, string about)
    {
        var entry = NotificationCatalogue.Groups.Single(g => g.Group == group);

        Assert.Equal(name, entry.Name);
        Assert.Equal(about, entry.About);
    }

    // Kind | Feature it belongs to
    [Theory]
    [InlineData(NotificationKind.PlanChanges, Feature.Plan)]
    [InlineData(NotificationKind.StoriesDue, Feature.Plan)]
    [InlineData(NotificationKind.ScheduleChanges, Feature.Schedules)]
    [InlineData(NotificationKind.GroupChat, null)]
    public void A_kind_made_by_one_feature_names_it(NotificationKind kind, Feature? feature)
    {
        Assert.Equal(feature, NotificationCatalogue.Of(kind).Feature);
    }
}
