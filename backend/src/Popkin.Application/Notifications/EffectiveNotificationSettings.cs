using Popkin.Domain;

namespace Popkin.Application.Notifications;

/// <summary>
/// What a person's notification settings come to: their choice where they made one, else the
/// catalogue's default (L2-154 AC1). The screen and the Worker read it the same way, so the screen
/// shows what will happen. A required kind is always on by email and never by phone (AC2).
/// </summary>
public sealed class EffectiveNotificationSettings(
    NotificationPreferences? preferences, IReadOnlyCollection<NotificationKindChoice> choices)
{
    public bool EmailOn => preferences?.EmailOn ?? true;

    public NotificationFrequency Frequency => preferences?.Frequency ?? NotificationFrequency.AsItHappens;

    public bool IsOn(NotificationKind kind, NotificationChannel channel)
    {
        var entry = NotificationCatalogue.Of(kind);
        if (entry.Required)
        {
            return channel == NotificationChannel.Email;
        }

        var chosen = choices.FirstOrDefault(c => c.Kind == kind)?.Of(channel);
        return chosen ?? (channel == NotificationChannel.Email ? entry.EmailByDefault : entry.PhoneByDefault);
    }
}
