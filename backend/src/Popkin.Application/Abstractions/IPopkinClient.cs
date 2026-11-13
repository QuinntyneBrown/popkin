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

    /// <summary>The person read a thread, here or on another device: its unread count is zero.</summary>
    Task ThreadRead(Guid threadId);

    /// <summary>
    /// How many members have the Popkin open changed. A state: it carries the whole count and a
    /// version that only rises, and an event whose version is not above the one held is dropped.
    /// </summary>
    Task PresenceChanged(Guid popkinId, long version, int hereNow);

    /// <summary>Someone joined the Popkin. The one who joined is not told.</summary>
    Task MemberJoined(Guid popkinId, MemberJoinedDto member);
}
