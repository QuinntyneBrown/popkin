using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>The member reading a thread: the client tells its own messages by `MembershipId`.</summary>
public sealed record ThreadViewerDto(Guid MembershipId, string FirstName);

/// <summary>
/// The other member of a direct message, as the one reading sees them: the name they go by,
/// their first name and their avatar, never a phone number or an email (L2-054 AC2).
/// </summary>
public sealed record ThreadOtherDto(Guid MembershipId, string DisplayName, string FirstName, AvatarDto Avatar)
{
    public static ThreadOtherDto Of(Membership other, IPhotoStore photos) =>
        new(other.Id, other.DisplayName, PersonName.FirstName(other.DisplayName), AvatarDto.Of(other, photos));
}

/// <summary>
/// A thread's header: the Popkin's look and end, how many members it has and how many are here
/// now, whether anything can still be posted, the reader's unread count and read point, and, on
/// a direct message, the other member; `Other` is null on Everyone. `PopkinVersion` orders the
/// `PopkinChanged` events that change the Popkin's look and end (L2-020). A direct message has two
/// members, and "here now" stays the Popkin's.
/// </summary>
public sealed record ThreadDto(
    Guid Id,
    Guid PopkinId,
    ChatThreadKind Kind,
    string PopkinName,
    string Emoji,
    PopkinColour Colour,
    DateTimeOffset? EndsAt,
    int MemberCount,
    int HereNow,
    long PresenceVersion,
    bool ReadOnly,
    int UnreadCount,
    Guid? LastReadMessageId,
    ThreadViewerDto Viewer,
    ThreadOtherDto? Other,
    long PopkinVersion)
{
    /// <summary>The header of a thread the member may read, with its other member when it is a direct message.</summary>
    public static async Task<ThreadDto> OfAsync(
        IAppDbContext db,
        PresenceTracker presence,
        IPhotoStore photos,
        PopkinSpace popkin,
        Membership membership,
        ChatThread thread,
        Membership? other,
        CancellationToken cancellationToken)
    {
        var memberCount = thread.Kind == ChatThreadKind.Direct
            ? 2
            : await db.Memberships.CountAsync(m => m.PopkinId == popkin.Id && m.LeftAt == null, cancellationToken);
        var unread = await ThreadUnread.OfAsync(db, thread.Id, membership.Id, cancellationToken);
        var hereNow = presence.Get(popkin.Id);

        return new ThreadDto(
            thread.Id,
            popkin.Id,
            thread.Kind,
            popkin.Name,
            popkin.Emoji,
            popkin.Colour,
            popkin.EndsAt,
            memberCount,
            hereNow.HereNow,
            hereNow.Version,
            popkin.Status == PopkinStatus.WrappedUp,
            unread.Count,
            unread.LastReadMessageId,
            new ThreadViewerDto(membership.Id, PersonName.FirstName(membership.DisplayName)),
            other is null ? null : ThreadOtherDto.Of(other, photos),
            popkin.Version);
    }
}

/// <summary>The Everyone thread of a Popkin, for any of its members (L2-021).</summary>
public sealed record GetEveryoneThreadQuery(Guid PopkinId) : IRequest<ThreadDto>;

public sealed class GetEveryoneThreadQueryHandler(IAppDbContext db, IMembershipGuard guard, PresenceTracker presence, IPhotoStore photos)
    : IRequestHandler<GetEveryoneThreadQuery, ThreadDto>
{
    public async Task<ThreadDto> Handle(GetEveryoneThreadQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);
        return await ThreadDto.OfAsync(db, presence, photos, popkin, membership, thread, other: null, cancellationToken);
    }
}
