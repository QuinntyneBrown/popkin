using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// The words of an activity alert: the Popkin's name as its title, and who did what as its line.
/// No member's words, caption or story title appear, since an alert shows on a locked phone
/// (L2-174 AC3).
/// </summary>
public static class PhoneAlerts
{
    public static PhoneAlert For(NotificationKind kind, string popkinName, string actorFirstName, string url) =>
        new(popkinName, LineOf(kind, actorFirstName), url);

    /// <summary>The line of the one alert for what quiet hours held back.</summary>
    public static string HeldBack(int count) => $"{count} new things while you were away";

    public static string LineOf(NotificationKind kind, string actor) => kind switch
    {
        NotificationKind.MentionsAndReplies => $"{actor} replied to you",
        NotificationKind.DirectMessages => $"{actor} sent you a message",
        NotificationKind.GroupChat => $"{actor} wrote in Everyone",
        NotificationKind.NewPhotos => $"{actor} added photos",
        NotificationKind.PlanChanges => $"{actor} changed the plan",
        NotificationKind.ScheduleChanges => $"{actor} changed the schedule",
        NotificationKind.PeopleJoining => $"{actor} joined",
        NotificationKind.Experiences => $"{actor} added to Experiences",
        _ => "Something new",
    };
}
