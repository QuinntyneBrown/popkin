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
    }

    /// <summary>L2-044 AC1: a Popkin wraps up within one minute of its end date.</summary>
    public void WrappedUpLate(TimeSpan lateness) => _wrapUpLateness.Record(lateness.TotalSeconds);

    /// <summary>The Worker's heartbeat: it has no HTTP surface to probe, so a tick that stops shows here.</summary>
    public void WrapUpTicked(DateTimeOffset finishedAt) => _wrapUpLastTick.Record(finishedAt.ToUnixTimeMilliseconds() / 1000d);

    /// <summary>L2-027 AC1: a message arrives within 1 second.</summary>
    public void HubSent(string eventName, TimeSpan duration) =>
        _hubSendDuration.Record(duration.TotalSeconds, new KeyValuePair<string, object?>("event", eventName));

    public void HubSendFailed(string eventName) =>
        _hubSendFailures.Add(1, new KeyValuePair<string, object?>("event", eventName));
}
