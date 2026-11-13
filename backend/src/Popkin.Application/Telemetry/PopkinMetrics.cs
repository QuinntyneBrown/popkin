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

    public PopkinMetrics(IMeterFactory meters)
    {
        var meter = meters.Create(MeterName);
        _hubSendDuration = meter.CreateHistogram<double>(
            "popkin.hub.send.duration", unit: "s", description: "The time a hub event takes to send, from the commit to the end of the send.");
        _hubSendFailures = meter.CreateCounter<long>(
            "popkin.hub.send.failures", description: "Hub events that could not be sent.");
    }

    /// <summary>L2-027 AC1: a message arrives within 1 second.</summary>
    public void HubSent(string eventName, TimeSpan duration) =>
        _hubSendDuration.Record(duration.TotalSeconds, new KeyValuePair<string, object?>("event", eventName));

    public void HubSendFailed(string eventName) =>
        _hubSendFailures.Add(1, new KeyValuePair<string, object?>("event", eventName));
}
