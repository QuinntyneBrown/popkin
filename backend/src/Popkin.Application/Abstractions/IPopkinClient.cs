using Popkin.Application.Chat;

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
}
