using System.Diagnostics.Metrics;

namespace Popkin.Application.Telemetry;

/// <summary>
/// Popkin's own measurements: instruments on the one meter, `Popkin` (ADR 0012). A dimension is
/// chosen from a fixed set (an event name), never from anything a person supplies.
/// </summary>
public sealed class PopkinMetrics
{
    public const string MeterName = "Popkin";

    private readonly Histogram<double> _hubSendDuration;
    private readonly Counter<long> _hubSendFailures;
    private readonly Histogram<double> _wrapUpLateness;
    private readonly Gauge<double> _wrapUpLastTick;
    private readonly Gauge<double> _remindersLastTick;
    private readonly Counter<long> _auditEntriesPurged;
    private readonly Counter<long> _remindersSent;
    private readonly Counter<long> _reminderSendFailures;
    private readonly Counter<long> _notificationEvents;
    private readonly Counter<long> _notificationDeliveries;
    private readonly Counter<long> _notificationsSuppressed;
    private readonly Histogram<double> _emailLatency;
    private readonly Histogram<double> _phoneLatency;
    private readonly Counter<long> _settingsChanged;
    private readonly Counter<long> _mutes;
    private readonly Counter<long> _unsubscribes;

    public PopkinMetrics(IMeterFactory meters)
    {
        var meter = meters.Create(MeterName);
        _hubSendDuration = meter.CreateHistogram<double>(
            "popkin.hub.send.duration", unit: "s", description: "The time a hub event takes to send, from the commit to the end of the send.");
        _hubSendFailures = meter.CreateCounter<long>(
            "popkin.hub.send.failures", description: "Hub events that could not be sent.");
        _wrapUpLateness = meter.CreateHistogram<double>(
            "popkin.wrap_up.lateness", unit: "s", description: "How long after its end date a Popkin was wrapped up.");
        _wrapUpLastTick = meter.CreateGauge<double>(
            "popkin.wrap_up.last_tick", unit: "s", description: "When the Worker last finished a wrap-up tick, in seconds since the Unix epoch.");
        _remindersLastTick = meter.CreateGauge<double>(
            "popkin.notifications.reminders.last_tick", unit: "s", description: "When a reminder job last finished a tick, by job, in seconds since the Unix epoch.");
        _auditEntriesPurged = meter.CreateCounter<long>(
            "popkin.audit.entries_purged", description: "Audit entries deleted at two years old (L2-120 AC6).");
        _remindersSent = meter.CreateCounter<long>(
            "popkin.contacts.reminders.sent", description: "Contacts reminders added in the app, or sent by phone or email (L2-140).");
        _reminderSendFailures = meter.CreateCounter<long>(
            "popkin.contacts.reminders.send_failures", description: "Contacts reminders a phone or email provider could not send.");
        _notificationEvents = meter.CreateCounter<long>(
            "popkin.notifications.events", description: "Notification events fanned out, by kind (L2-161).");
        _notificationDeliveries = meter.CreateCounter<long>(
            "popkin.notifications.deliveries", description: "Notification deliveries by kind, channel and outcome: sent, suppressed, failed or dropped.");
        _notificationsSuppressed = meter.CreateCounter<long>(
            "popkin.notifications.suppressed", description: "Notification deliveries stopped, by the rule that stopped them (L2-161 AC1).");
        _emailLatency = meter.CreateHistogram<double>(
            "popkin.notifications.email_latency", unit: "s", description: "From an email's window closing to the provider accepting it (L2-175 AC1).");
        _phoneLatency = meter.CreateHistogram<double>(
            "popkin.notifications.phone_latency", unit: "s", description: "From a change to the push service accepting its alert (L2-175 AC1).");
        _settingsChanged = meter.CreateCounter<long>(
            "popkin.notifications.settings_changed", description: "Notification settings saved, by setting (email, frequency, kind) and channel.");
        _mutes = meter.CreateCounter<long>(
            "popkin.notifications.mutes", description: "People muted and unmuted, by action (L2-160).");
        _unsubscribes = meter.CreateCounter<long>(
            "popkin.notifications.unsubscribes", description: "Unsubscribe links used, by outcome (L2-168).");
    }

    /// <summary>`action` is mute or unmute; neither person is a dimension.</summary>
    public void PersonMuted(string action) => _mutes.Add(1, new KeyValuePair<string, object?>("action", action));

    /// <summary>`outcome` is unsubscribed, already or expired; never the person or the token (L2-174 AC3).</summary>
    public void Unsubscribe(string outcome) => _unsubscribes.Add(1, new KeyValuePair<string, object?>("outcome", outcome));

    public void NotificationEvent(string kind) => _notificationEvents.Add(1, new KeyValuePair<string, object?>("kind", kind));

    /// <summary>`channel` is phone or email; `outcome` is sent, suppressed, failed or dropped.</summary>
    public void NotificationDelivered(string kind, string channel, string outcome, int count = 1) =>
        _notificationDeliveries.Add(
            count,
            new KeyValuePair<string, object?>("kind", kind),
            new KeyValuePair<string, object?>("channel", channel),
            new KeyValuePair<string, object?>("outcome", outcome));

    /// <summary>A delivery the rules stopped: counted as an outcome and by its rule.</summary>
    public void Suppressed(Domain.NotificationKind kind, Domain.NotificationChannel channel, Domain.SuppressionRule rule)
    {
        NotificationDelivered(kind.ToString(), channel == Domain.NotificationChannel.Phone ? "phone" : "email", "suppressed");
        _notificationsSuppressed.Add(1, new KeyValuePair<string, object?>("rule", SnakeCase(rule.ToString())));
    }

    /// <summary>A rule as the designs name it: `PopkinMuted` is `popkin_muted`.</summary>
    private static string SnakeCase(string name) =>
        string.Concat(name.Select((c, i) => char.IsUpper(c) ? (i > 0 ? "_" : "") + char.ToLowerInvariant(c) : c.ToString()));

    public void EmailAccepted(TimeSpan latency) => _emailLatency.Record(Math.Max(0, latency.TotalSeconds));

    public void PhoneAccepted(TimeSpan latency) => _phoneLatency.Record(Math.Max(0, latency.TotalSeconds));

    /// <summary>`setting` is email, frequency or kind; `channel` is email or phone.</summary>
    public void NotificationSettingChanged(string setting, string channel) =>
        _settingsChanged.Add(1, new KeyValuePair<string, object?>("setting", setting), new KeyValuePair<string, object?>("channel", channel));

    /// <summary>L2-044 AC1: a Popkin wraps up within one minute of its end date.</summary>
    public void WrappedUpLate(TimeSpan lateness) => _wrapUpLateness.Record(lateness.TotalSeconds);

    /// <summary>The Worker's heartbeat: it has no HTTP surface to probe, so a tick that stops shows here.</summary>
    public void WrapUpTicked(DateTimeOffset finishedAt) => _wrapUpLastTick.Record(finishedAt.ToUnixTimeMilliseconds() / 1000d);

    /// <summary>A reminder job's tick finished: `contacts` or `popkins`.</summary>
    public void RemindersTicked(string job, DateTimeOffset finishedAt) =>
        _remindersLastTick.Record(finishedAt.ToUnixTimeMilliseconds() / 1000d, new KeyValuePair<string, object?>("job", job));

    /// <summary>L2-027 AC1: a message arrives within 1 second.</summary>
    public void HubSent(string eventName, TimeSpan duration) =>
        _hubSendDuration.Record(duration.TotalSeconds, new KeyValuePair<string, object?>("event", eventName));

    public void HubSendFailed(string eventName) =>
        _hubSendFailures.Add(1, new KeyValuePair<string, object?>("event", eventName));

    public void AuditEntriesPurged(int count) => _auditEntriesPurged.Add(count);

    /// <summary>L2-140: `channel` is one of in_app, phone and email.</summary>
    public void RemindersSent(string channel, int count)
    {
        if (count > 0)
        {
            _remindersSent.Add(count, new KeyValuePair<string, object?>("channel", channel));
        }
    }

    public void ReminderSendFailed(string channel) =>
        _reminderSendFailures.Add(1, new KeyValuePair<string, object?>("channel", channel));
}
