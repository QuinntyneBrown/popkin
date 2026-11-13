using System.Diagnostics;
using Microsoft.AspNetCore.SignalR;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Telemetry;

namespace Popkin.Api.Hubs;

/// <summary>
/// Sends the events of <see cref="IPopkinClient"/> through `PopkinHub`. Every send is awaited
/// and names a group or a person. A send that fails is logged and counted and never fails the
/// request that caused it: what was saved stays saved, and the event's recovery read gives the
/// same state. Each send is timed as `popkin.hub.send.duration`, by event name only (ADR 0012).
/// </summary>
public sealed class SignalRPopkinNotifier(
    IHubContext<PopkinHub, IPopkinClient> hub, PopkinMetrics metrics, ILogger<SignalRPopkinNotifier> logger) : IPopkinNotifier
{
    public Task MessageAdded(Guid popkinId, MessageDto message) =>
        SendAsync(nameof(IPopkinClient.MessageAdded), () => Group(popkinId).MessageAdded(message));

    public Task MessageDeleted(Guid popkinId, Guid threadId, Guid messageId) =>
        SendAsync(nameof(IPopkinClient.MessageDeleted), () => Group(popkinId).MessageDeleted(threadId, messageId));

    public Task ThreadRead(Guid personId, Guid threadId) =>
        SendAsync(nameof(IPopkinClient.ThreadRead), () => hub.Clients.User(personId.ToString()).ThreadRead(threadId));

    public Task PresenceChanged(Guid popkinId, long version, int hereNow) =>
        SendAsync(nameof(IPopkinClient.PresenceChanged), () => Group(popkinId).PresenceChanged(popkinId, version, hereNow));

    private IPopkinClient Group(Guid popkinId) => hub.Clients.Group(PopkinHub.GroupOf(popkinId));

    private async Task SendAsync(string eventName, Func<Task> send)
    {
        var started = Stopwatch.GetTimestamp();
        try
        {
            await send();
            metrics.HubSent(eventName, Stopwatch.GetElapsedTime(started));
        }
        catch (Exception exception)
        {
            // The event name only: no id, no text (L2-054 AC3).
            metrics.HubSendFailed(eventName);
            logger.LogError(exception, "The hub event {Event} could not be sent", eventName);
        }
    }
}
