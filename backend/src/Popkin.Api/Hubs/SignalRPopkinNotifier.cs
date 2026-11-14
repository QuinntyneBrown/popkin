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
    public Task MessageAdded(Audience audience, MessageDto message) =>
        SendAsync(nameof(IPopkinClient.MessageAdded), () => To(audience).MessageAdded(message));

    public Task MessageDeleted(Audience audience, Guid threadId, Guid messageId) =>
        SendAsync(nameof(IPopkinClient.MessageDeleted), () => To(audience).MessageDeleted(threadId, messageId));

    public Task ReactionsChanged(Audience audience, Guid threadId, Guid messageId, IReadOnlyList<ReactionDto> reactions) =>
        SendAsync(nameof(IPopkinClient.ReactionsChanged), () => To(audience).ReactionsChanged(threadId, messageId, reactions));

    public Task ThreadRead(Guid personId, Guid threadId) =>
        SendAsync(nameof(IPopkinClient.ThreadRead), () => hub.Clients.User(personId.ToString()).ThreadRead(threadId));

    public Task PresenceChanged(Guid popkinId, long version, int hereNow) =>
        SendAsync(nameof(IPopkinClient.PresenceChanged), () => Group(popkinId).PresenceChanged(popkinId, version, hereNow));

    public Task MemberJoined(Guid popkinId, MemberJoinedDto member) =>
        SendAsync(nameof(IPopkinClient.MemberJoined), () => Group(popkinId).MemberJoined(popkinId, member));

    public Task MemberLeft(Guid popkinId, Guid membershipId) =>
        SendAsync(nameof(IPopkinClient.MemberLeft), () => Group(popkinId).MemberLeft(popkinId, membershipId));

    public Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds) =>
        SendAsync(nameof(IPopkinClient.PhotosAdded), () => Group(popkinId).PhotosAdded(popkinId, photoIds));

    public Task CallChanged(Audience audience, Guid callId, long version, int participantCount, Guid? threadId) =>
        SendAsync(
            nameof(IPopkinClient.CallChanged),
            () => To(audience).CallChanged(audience.PopkinId, callId, version, participantCount, threadId));

    public Task CallEnded(Audience audience, Guid callId, Guid? threadId) =>
        SendAsync(nameof(IPopkinClient.CallEnded), () => To(audience).CallEnded(audience.PopkinId, callId, threadId));

    public Task PopkinWrappedUp(Guid popkinId) =>
        SendAsync(nameof(IPopkinClient.PopkinWrappedUp), () => Group(popkinId).PopkinWrappedUp(popkinId));

    public Task ParticipantJoined(Guid callId, CallParticipantDto participant) =>
        SendAsync(nameof(IPopkinClient.ParticipantJoined), () => Call(callId).ParticipantJoined(callId, participant));

    public Task ParticipantLeft(Guid callId, Guid membershipId) =>
        SendAsync(nameof(IPopkinClient.ParticipantLeft), () => Call(callId).ParticipantLeft(callId, membershipId));

    public Task ParticipantMediaChanged(Guid callId, Guid membershipId, long mediaVersion, bool micOn, bool cameraOn) =>
        SendAsync(
            nameof(IPopkinClient.ParticipantMediaChanged),
            () => Call(callId).ParticipantMediaChanged(callId, membershipId, mediaVersion, micOn, cameraOn));

    public Task Signal(string connectionId, Guid callId, Guid fromMembershipId, CallSignalDto signal) =>
        SendAsync(nameof(IPopkinClient.Signal), () => hub.Clients.Client(connectionId).Signal(callId, fromMembershipId, signal));

    private IPopkinClient Call(Guid callId) => hub.Clients.Group(PopkinHub.CallGroupOf(callId));

    /// <summary>The Popkin's group, or the people named on every connection they hold, never the group (L2-023 AC2).</summary>
    private IPopkinClient To(Audience audience) =>
        audience.PersonIds is { } people
            ? hub.Clients.Users(people.Select(p => p.ToString()).ToList())
            : Group(audience.PopkinId);

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
