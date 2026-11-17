using System.Text.Json;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// What sets a reminder event apart in the dispatcher (send-reminders): it goes at once, as an
/// email of its own, and a follow-up or a habit goes to the phone alone.
/// </summary>
public static class ReminderEvents
{
    public static bool IsReminder(NotificationKind kind) =>
        NotificationCatalogue.Of(kind).Group == NotificationGroup.Reminders;

    /// <summary>The `reminder` fact of a "Birthdays" event: KeyDate, FollowUp or Habit.</summary>
    public static string? ReminderOf(NotificationEvent notification)
    {
        if (notification.Facts is not { Length: > 0 } facts)
        {
            return null;
        }

        using var json = JsonDocument.Parse(facts);
        return json.RootElement.TryGetProperty("reminder", out var reminder) ? reminder.GetString() : null;
    }

    /// <summary>The channels the event can reach: the phone alone for a follow-up or a habit (L2-140 AC2).</summary>
    public static NotificationChannel[] ChannelsOf(NotificationEvent notification) =>
        notification.Kind == NotificationKind.Birthdays && ReminderOf(notification) is "FollowUp" or "Habit"
            ? [NotificationChannel.Phone]
            : [NotificationChannel.Phone, NotificationChannel.Email];

    /// <summary>The email a reminder becomes, by its kind.</summary>
    public static NotificationEmailKind EmailKindOf(NotificationKind kind) => kind switch
    {
        NotificationKind.Birthdays => NotificationEmailKind.KeyDateReminder,
        NotificationKind.StoriesDue => NotificationEmailKind.StoryDue,
        NotificationKind.PopkinWrappingUp => NotificationEmailKind.WrapUp,
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Not a reminder."),
    };
}
