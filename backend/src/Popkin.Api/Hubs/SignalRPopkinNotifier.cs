using System.Diagnostics;
using Microsoft.AspNetCore.SignalR;
using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Application.Chat;
using Popkin.Application.Invites;
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

    public Task MemberJoined(Guid popkinId, MemberJoinedDto member) =>
        SendAsync(nameof(IPopkinClient.MemberJoined), () => Group(popkinId).MemberJoined(popkinId, member));

    public Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds) =>
        SendAsync(nameof(IPopkinClient.PhotosAdded), () => Group(popkinId).PhotosAdded(popkinId, photoIds));

    public Task CallChanged(Guid popkinId, Guid callId, long version, int participantCount) =>
        SendAsync(nameof(IPopkinClient.CallChanged), () => Group(popkinId).CallChanged(popkinId, callId, version, participantCount));

    public Task CallEnded(Guid popkinId, Guid callId) =>
        SendAsync(nameof(IPopkinClient.CallEnded), () => Group(popkinId).CallEnded(popkinId, callId));

    public Task ParticipantJoined(Guid callId, CallParticipantDto participant) =>
        SendAsync(nameof(IPopkinClient.ParticipantJoined), () => Call(callId).ParticipantJoined(callId, participant));

    public Task ParticipantLeft(Guid callId, Guid membershipId) =>
        SendAsync(nameof(IPopkinClient.ParticipantLeft), () => Call(callId).ParticipantLeft(callId, membershipId));

    public Task ParticipantMediaChanged(Guid callId, Guid membershipId, long mediaVersion, bool micOn, bool cameraOn) =>
        SendAsync(
            nameof(IPopkinClient.ParticipantMediaChanged),
            () => Call(callId).ParticipantMediaChanged(callId, membershipId, mediaVersion, micOn, cameraOn));

    private IPopkinClient Call(Guid callId) => hub.Clients.Group(PopkinHub.CallGroupOf(callId));

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
