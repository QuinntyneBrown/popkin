using Popkin.Application.Notifications.Dispatch;
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

/// <summary>One case per cell of popkin-levels, "What each level lets through" (L2-158 AC2, AC3).</summary>
public sealed class LevelAllowsTests
{
    public static TheoryData<NotificationKind, bool, bool, bool, bool> Table => new()
    {
        // kind, for the person, Everything, Just for me, Muted
        { NotificationKind.MentionsAndReplies, false, true, true, false },
        { NotificationKind.DirectMessages, false, true, true, false },
        { NotificationKind.GroupChat, false, true, false, false },
        { NotificationKind.NewPhotos, false, true, false, false },
        { NotificationKind.PlanChanges, true, true, true, false },
        { NotificationKind.PlanChanges, false, true, false, false },
        { NotificationKind.ScheduleChanges, false, true, false, false },
        { NotificationKind.PeopleJoining, false, true, false, false },
        { NotificationKind.Experiences, false, true, false, false },
        { NotificationKind.StoriesDue, false, true, true, true },
        { NotificationKind.PopkinWrappingUp, false, true, true, true },
    };

    [Theory]
    [MemberData(nameof(Table))]
    public void Each_level_lets_through_its_kinds(NotificationKind kind, bool forThePerson, bool everything, bool justForMe, bool muted)
    {
        Assert.Equal(everything, NotificationRules.LevelAllows(PopkinNotificationLevel.Everything, kind, forThePerson));
        Assert.Equal(justForMe, NotificationRules.LevelAllows(PopkinNotificationLevel.JustForMe, kind, forThePerson));
        Assert.Equal(muted, NotificationRules.LevelAllows(PopkinNotificationLevel.Muted, kind, forThePerson));
    }
}
