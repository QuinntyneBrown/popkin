using Popkin.Application.Abstractions;
using Popkin.Application.Calls;
using Popkin.Application.Chat;
using Popkin.Application.Invites;

namespace Popkin.Worker;

/// <summary>
/// The Worker holds no hub connections, so it tells nobody: every event is dropped. A Popkin
/// the Worker wraps up reaches the screens that have it open through the web app's own clock
/// check, and each event's recovery read gives the same state (known gap 13).
/// </summary>
public sealed class SilentPopkinNotifier : IPopkinNotifier
{
    public Task MessageAdded(Guid popkinId, MessageDto message) => Task.CompletedTask;

    public Task MessageDeleted(Guid popkinId, Guid threadId, Guid messageId) => Task.CompletedTask;

    public Task ThreadRead(Guid personId, Guid threadId) => Task.CompletedTask;

    public Task PresenceChanged(Guid popkinId, long version, int hereNow) => Task.CompletedTask;

    public Task MemberJoined(Guid popkinId, MemberJoinedDto member) => Task.CompletedTask;

    public Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds) => Task.CompletedTask;

    public Task CallChanged(Guid popkinId, Guid callId, long version, int participantCount) => Task.CompletedTask;

    public Task CallEnded(Guid popkinId, Guid callId) => Task.CompletedTask;

    public Task PopkinWrappedUp(Guid popkinId) => Task.CompletedTask;

    public Task ParticipantJoined(Guid callId, CallParticipantDto participant) => Task.CompletedTask;

    public Task ParticipantLeft(Guid callId, Guid membershipId) => Task.CompletedTask;

    public Task MemberLeft(Guid popkinId, Guid membershipId) => Task.CompletedTask;

    public Task ParticipantMediaChanged(Guid callId, Guid membershipId, long mediaVersion, bool micOn, bool cameraOn) => Task.CompletedTask;

    public Task Signal(string connectionId, Guid callId, Guid fromMembershipId, CallSignalDto signal) => Task.CompletedTask;
}

/// <summary>The Worker has no hub, so no connection to put in a group.</summary>
public sealed class NoPopkinConnections : IPopkinConnections
{
    public Task AddToPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task RemoveFromPopkinAsync(string connectionId, Guid popkinId, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task AddToCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task RemoveFromCallAsync(string connectionId, Guid callId, CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>
/// A job acts for nobody: it sends only commands whose handlers never ask who is signed in. A
/// handler that asks is one the Worker must not reach.
/// </summary>
public sealed class NoCurrentPerson : ICurrentPerson
{
    public Guid PersonId => throw new InvalidOperationException("A Worker job has no signed-in person.");

    public Guid SessionId => throw new InvalidOperationException("A Worker job has no session.");

    public Guid? FindPersonId() => null;
}
