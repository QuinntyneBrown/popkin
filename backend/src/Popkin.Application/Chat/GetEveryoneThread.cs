using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Realtime;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>The member reading a thread: the client tells its own messages by `MembershipId`.</summary>
public sealed record ThreadViewerDto(Guid MembershipId, string FirstName);

/// <summary>
/// A thread's header: the Popkin's look and end, how many members it has and how many are here
/// now, whether anything can still be posted, and the reader's unread count and read point.
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
    ThreadViewerDto Viewer);

/// <summary>The Everyone thread of a Popkin, for any of its members (L2-021).</summary>
public sealed record GetEveryoneThreadQuery(Guid PopkinId) : IRequest<ThreadDto>;

public sealed class GetEveryoneThreadQueryHandler(IAppDbContext db, IMembershipGuard guard, PresenceTracker presence)
    : IRequestHandler<GetEveryoneThreadQuery, ThreadDto>
{
    public async Task<ThreadDto> Handle(GetEveryoneThreadQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);
        var memberCount = await db.Memberships.CountAsync(m => m.PopkinId == popkin.Id && m.LeftAt == null, cancellationToken);
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
            new ThreadViewerDto(membership.Id, PersonName.FirstName(membership.DisplayName)));
    }
}
