using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>Everything the rules need to know about one delivery, read by the dispatcher.</summary>
public sealed record NotificationQuestion(
    NotificationKind Kind,
    NotificationChannel Channel,
    bool RecipientIsActor,
    bool RecipientIsActiveMember,
    bool PopkinWrappedUp,
    bool HasDevice,
    bool SwitchOn);

/// <summary>Send, or stop with the rule that applied.</summary>
public readonly record struct NotificationDecision(SuppressionRule? Rule)
{
    public static NotificationDecision Send => new(null);

    public bool Sends => Rule is null;

    public static NotificationDecision Suppress(SuppressionRule rule) => new(rule);
}

/// <summary>
/// Whether a notification is sent (L2-161 AC1): the first rule that applies stops it, in the
/// order of the rules table in deliver-notifications. Pure: it reads no database and no clock.
/// </summary>
public static class NotificationRules
{
    public static NotificationDecision Decide(NotificationQuestion q)
    {
        if (q.RecipientIsActor)
        {
            return NotificationDecision.Suppress(SuppressionRule.OwnAction);
        }

        if (!q.RecipientIsActiveMember)
        {
            return NotificationDecision.Suppress(SuppressionRule.NotAMember);
        }

        if (q.PopkinWrappedUp)
        {
            return NotificationDecision.Suppress(SuppressionRule.WrappedUp);
        }

        if (q.Channel == NotificationChannel.Phone && !q.HasDevice)
        {
            return NotificationDecision.Suppress(SuppressionRule.NoDevice);
        }

        if (!q.SwitchOn)
        {
            return NotificationDecision.Suppress(SuppressionRule.KindSwitchedOff);
        }

        return NotificationDecision.Send;
    }
}
