using Popkin.Application.Calls;
using Popkin.Application.Chat;
using Popkin.Application.Invites;

namespace Popkin.Application.Abstractions;

/// <summary>
/// The events `PopkinHub` sends to its clients, one method per event: the name of the method is
/// the name of the event, and its parameters are the event's arguments in order. An event is a
/// hint that something changed; each has a read that recovers it
/// (docs/detailed-designs/chat/live-messages).
/// </summary>
public interface IPopkinClient
{
    /// <summary>A message was added to a thread. A fact: it is ordered by `(SentAt, Id)`, not by arrival.</summary>
    Task MessageAdded(MessageDto message);

    /// <summary>A message was deleted. A fact: applying it twice, or before its message, ends the same.</summary>
    Task MessageDeleted(Guid threadId, Guid messageId);

    /// <summary>
    /// A message's reactions changed (L2-024). A state: it carries the message's whole summary
    /// and its reactions version, which only rises, and an event whose version is not above the
    /// one held is dropped; a read of the thread's messages recovers it.
    /// </summary>
    Task ReactionsChanged(Guid threadId, Guid messageId, int version, IReadOnlyList<ReactionDto> reactions);

    /// <summary>The person read a thread, here or on another device: its unread count is zero.</summary>
    Task ThreadRead(Guid threadId);

    /// <summary>
    /// How many members have the Popkin open changed. A state: it carries the whole count and a
    /// version that only rises, and an event whose version is not above the one held is dropped.
    /// </summary>
    Task PresenceChanged(Guid popkinId, long version, int hereNow);

    /// <summary>Someone joined the Popkin. The one who joined is not told.</summary>
    Task MemberJoined(Guid popkinId, MemberJoinedDto member);

    /// <summary>
    /// Someone left the Popkin (L2-047 AC2). A fact: the members read again, and the one who
    /// left is not told, nor sent anything of the Popkin after it.
    /// </summary>
    Task MemberLeft(Guid popkinId, Guid membershipId);

    /// <summary>
    /// Photos were added to the Popkin's album. A hint: it carries their ids only, and the
    /// album read gives the photos (L2-031 AC7).
    /// </summary>
    Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds);

    /// <summary>
    /// How many are on a call of the Popkin changed: its group call, or the direct call of the
    /// direct message `threadId` names, which only its two members are told of. A state: it
    /// carries the whole count and the call's version, which only rises, and an event whose
    /// version is not above the one held is dropped. `GET …/calls/current`, with the
    /// `threadId` of a direct call, recovers it.
    /// </summary>
    Task CallChanged(Guid popkinId, Guid callId, long version, int participantCount, Guid? threadId);

    /// <summary>
    /// The last person left, or the Popkin wrapped up, and the call ended (L2-029 AC6). A fact,
    /// and final: a `CallChanged` of that call that arrives after it is ignored. `threadId` is
    /// that of a direct call, and null for the group call.
    /// </summary>
    Task CallEnded(Guid popkinId, Guid callId, Guid? threadId);

    /// <summary>
    /// The Popkin wrapped up and is read-only from now on (L2-044 AC4). A fact, and final;
    /// `GET /api/popkins/{popkinId}` recovers it.
    /// </summary>
    Task PopkinWrappedUp(Guid popkinId);

    /// <summary>
    /// Someone came onto the call. A fact, sent to the connections on the call; the one who
    /// joined has the participants from the answer to their join.
    /// </summary>
    Task ParticipantJoined(Guid callId, CallParticipantDto participant);

    /// <summary>Someone left the call. A fact: applying it twice, or for someone not held, ends the same.</summary>
    Task ParticipantLeft(Guid callId, Guid membershipId);

    /// <summary>
    /// A participant's microphone or camera changed. A state: it carries both values in full
    /// and the participant's media version, which only rises, and an event whose version is
    /// not above the one held for that participant is dropped.
    /// </summary>
    Task ParticipantMediaChanged(Guid callId, Guid membershipId, long mediaVersion, bool micOn, bool cameraOn);

    /// <summary>
    /// Another participant's offer, answer or candidate, for this participant alone. An edge:
    /// each one sent arrives once and none stands for another.
    /// </summary>
    Task Signal(Guid callId, Guid fromMembershipId, CallSignalDto signal);
}
