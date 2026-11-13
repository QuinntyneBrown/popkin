using Popkin.Application.Calls;
using Popkin.Application.Chat;
using Popkin.Application.Invites;

namespace Popkin.Application.Abstractions;

/// <summary>
/// Tells the people concerned that something changed, after it was saved. A handler calls it
/// once its unit of work is committed; a notification that cannot be delivered never fails the
/// request, because the read that recovers it gives the same state.
/// </summary>
public interface IPopkinNotifier
{
    /// <summary>To the thread's audience: the Popkin for Everyone, the two members for a direct message.</summary>
    Task MessageAdded(Audience audience, MessageDto message);

    /// <summary>To the thread's audience: the Popkin for Everyone, the two members for a direct message.</summary>
    Task MessageDeleted(Audience audience, Guid threadId, Guid messageId);

    /// <summary>To that person only, on every connection they hold.</summary>
    Task ThreadRead(Guid personId, Guid threadId);

    /// <summary>To every member of the Popkin with a connection open.</summary>
    Task PresenceChanged(Guid popkinId, long version, int hereNow);

    /// <summary>Someone joined the Popkin. The one who joined is not told.</summary>
    Task MemberJoined(Guid popkinId, MemberJoinedDto member);

    /// <summary>Someone left the Popkin. To the members who remain; the one who left is not told.</summary>
    Task MemberLeft(Guid popkinId, Guid membershipId);

    /// <summary>Photos were added to the album. To every member of the Popkin with a connection open.</summary>
    Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds);

    /// <summary>How many are on a call changed. To the call's audience: the Popkin for the group call, the two members for a direct call.</summary>
    Task CallChanged(Audience audience, Guid callId, long version, int participantCount, Guid? threadId);

    /// <summary>A call ended. To the call's audience: the Popkin for the group call, the two members for a direct call.</summary>
    Task CallEnded(Audience audience, Guid callId, Guid? threadId);

    /// <summary>The Popkin wrapped up. To every member of the Popkin with a connection open.</summary>
    Task PopkinWrappedUp(Guid popkinId);

    /// <summary>Someone came onto the call. To the connections on the call.</summary>
    Task ParticipantJoined(Guid callId, CallParticipantDto participant);

    /// <summary>Someone left the call. To the connections on the call.</summary>
    Task ParticipantLeft(Guid callId, Guid membershipId);

    /// <summary>A participant's microphone or camera changed. To the connections on the call.</summary>
    Task ParticipantMediaChanged(Guid callId, Guid membershipId, long mediaVersion, bool micOn, bool cameraOn);

    /// <summary>A participant's signal. To the one connection the participant it is for is on the call with.</summary>
    Task Signal(string connectionId, Guid callId, Guid fromMembershipId, CallSignalDto signal);
}
