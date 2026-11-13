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
    /// <summary>To every member of the Popkin with a connection open.</summary>
    Task MessageAdded(Guid popkinId, MessageDto message);

    /// <summary>To every member of the Popkin with a connection open.</summary>
    Task MessageDeleted(Guid popkinId, Guid threadId, Guid messageId);

    /// <summary>To that person only, on every connection they hold.</summary>
    Task ThreadRead(Guid personId, Guid threadId);

    /// <summary>To every member of the Popkin with a connection open.</summary>
    Task PresenceChanged(Guid popkinId, long version, int hereNow);

    /// <summary>Someone joined the Popkin. The one who joined is not told.</summary>
    Task MemberJoined(Guid popkinId, MemberJoinedDto member);

    /// <summary>Photos were added to the album. To every member of the Popkin with a connection open.</summary>
    Task PhotosAdded(Guid popkinId, IReadOnlyList<Guid> photoIds);

    /// <summary>How many are on the group call changed. To every member of the Popkin with a connection open.</summary>
    Task CallChanged(Guid popkinId, Guid callId, long version, int participantCount);

    /// <summary>The group call ended. To every member of the Popkin with a connection open.</summary>
    Task CallEnded(Guid popkinId, Guid callId);
}
