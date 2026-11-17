using System.Diagnostics.Metrics;
using System.Net.Http.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Telemetry;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The notifications' telemetry on the `Popkin` meter (deliver-notifications, notification-settings;
/// ADR 0012): counts by kind, channel, outcome and rule, the latencies, and no dimension that
/// carries a person, an address, a name, text, a token or a link (L2-174 AC3).
/// </summary>
public sealed class NotificationTelemetryTests
{
    private sealed record Measurement(string Instrument, double Value, Dictionary<string, string> Tags);

    private static readonly HashSet<string> AllowedTags = ["kind", "channel", "outcome", "rule", "setting"];

    // Given Ruth (by email, with a phone that allows alerts) and Mara (no device), when Joel replies
    // to Ruth and Ruth changes a setting, then events, deliveries sent and suppressed, the rule,
    // both latencies and the setting change are measured, with fixed dimensions only.
    [Fact]
    public async Task Notifications_are_measured_with_no_personal_dimension()
    {
        using var api = new ApiFactory();
        var measured = new List<Measurement>();
        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, l) =>
        {
            if (instrument.Meter.Name == PopkinMetrics.MeterName && instrument.Name.StartsWith("popkin.notifications.", StringComparison.Ordinal))
            {
                l.EnableMeasurementEvents(instrument);
            }
        };
        void Record(Instrument instrument, double value, ReadOnlySpan<KeyValuePair<string, object?>> tags)
        {
            var copy = new Dictionary<string, string>();
            foreach (var tag in tags)
            {
                copy[tag.Key] = tag.Value?.ToString() ?? "";
            }

            lock (measured)
            {
                measured.Add(new Measurement(instrument.Name, value, copy));
            }
        }

        listener.SetMeasurementEventCallback<long>((i, v, t, _) => Record(i, v, t));
        listener.SetMeasurementEventCallback<double>((i, v, t, _) => Record(i, v, t));
        listener.Start();

        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedByEmailAsync(lakeside.Code, "Ruth Lindqvist", "ruth@example.com");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        await ruth.AllowsAlertsAsync();
        var asked = (await ruth.SentMessageAsync(lakeside.Id, everyone, "Paddles?")).Id();

        await joel.RepliedAsync(lakeside.Id, everyone, asked, "Mine");
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(10));
        await api.DispatchAsync();
        (await ruth.PutAsJsonAsync("/api/me/notifications/kinds/GroupChat", new { phone = false })).EnsureSuccessStatusCode();
        listener.RecordObservableInstruments();

        List<Measurement> Of(string name) => measured.Where(m => m.Instrument == name).ToList();
        Assert.Contains(Of("popkin.notifications.events"), m => m.Tags["kind"] == "MentionsAndReplies");
        Assert.Contains(Of("popkin.notifications.deliveries"), m => m.Tags is { } t && t["kind"] == "MentionsAndReplies" && t["channel"] == "phone" && t["outcome"] == "sent");
        Assert.Contains(Of("popkin.notifications.deliveries"), m => m.Tags is { } t && t["channel"] == "email" && t["outcome"] == "sent");
        Assert.Contains(Of("popkin.notifications.deliveries"), m => m.Tags["outcome"] == "suppressed");
        Assert.Contains(Of("popkin.notifications.suppressed"), m => m.Tags["rule"] == "no_device");
        Assert.Single(Of("popkin.notifications.email_latency"));
        Assert.NotEmpty(Of("popkin.notifications.phone_latency"));
        Assert.Contains(Of("popkin.notifications.settings_changed"), m => m.Tags is { } t && t["setting"] == "kind" && t["channel"] == "phone");
        Assert.All(measured, m =>
        {
            Assert.Subset(AllowedTags, m.Tags.Keys.ToHashSet());
            Assert.All(m.Tags.Values, value =>
            {
                Assert.DoesNotContain("@", value);
                Assert.DoesNotContain("http", value);
                Assert.False(Guid.TryParse(value, out _), $"{m.Instrument} carries an id");
            });
        });
    }
}
