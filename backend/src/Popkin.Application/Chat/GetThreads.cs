using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>The latest message a member wrote in Everyone, as its card shows it.</summary>
public sealed record EveryoneLatestDto(string FirstName, string Text, bool IsMine, DateTimeOffset SentAt);

/// <summary>The Everyone card of the Chat tab: its latest message by a member, if any, and how many are unread.</summary>
public sealed record EveryoneSummaryDto(Guid ThreadId, EveryoneLatestDto? Latest, int UnreadCount);

/// <summary>The latest message of a direct message: its author is one of the two, so `IsMine` says which.</summary>
public sealed record DirectLatestDto(string Text, bool IsMine, DateTimeOffset SentAt);

/// <summary>A row of the Chat tab: the other member by name and avatar only (L2-054 AC2), the latest message and the unread count.</summary>
public sealed record DirectSummaryDto(Guid ThreadId, ThreadOtherDto Other, DirectLatestDto Latest, int UnreadCount);

/// <summary>
/// The Chat tab of a Popkin: Everyone, then the reader's direct messages that hold a message,
/// the most recent first (L2-022). `ViewerMembershipId` is the reader's own membership.
/// </summary>
public sealed record ThreadListDto(Guid ViewerMembershipId, EveryoneSummaryDto Everyone, IReadOnlyList<DirectSummaryDto> Direct);

/// <summary>The threads of a Popkin the caller can read, for any of its members (L2-022, L2-051 AC1).</summary>
public sealed record GetThreadsQuery(Guid PopkinId) : IRequest<ThreadListDto>;

public sealed class GetThreadsQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetThreadsQuery, ThreadListDto>
{
    public async Task<ThreadListDto> Handle(GetThreadsQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var everyone = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);
        var direct = await DirectThreads.Of(db, [membership.Id]).AsNoTracking()
            .Where(t => t.PopkinId == popkin.Id)
            .ToListAsync(cancellationToken);

        // What members wrote in Everyone: the notes Popkin writes itself, such as "popped in", are left out.
        var everyoneLatest = await db.Messages.AsNoTracking()
            .Where(m => m.ThreadId == everyone.Id && m.DeletedAt == null && m.Kind == MessageKind.Member)
            .Newest()
            .FirstOrDefaultAsync(cancellationToken);
        var directIds = direct.Select(t => t.Id).ToList();
        var directLatest = await DirectThreads.Latest(db.Messages.AsNoTracking().Where(m => directIds.Contains(m.ThreadId) && m.DeletedAt == null))
            .ToDictionaryAsync(m => m.ThreadId, cancellationToken);
        var unread = await ThreadUnread.CountsAsync(db, [everyone.Id, .. directIds], [membership.Id], cancellationToken);

        // A member who has left still wrote their messages, so people are read whether or not they are still in.
        var peopleIds = direct.Select(t => t.OtherThan(membership.Id)!.Value)
            .Append(everyoneLatest?.AuthorMembershipId ?? membership.Id)
            .Distinct()
            .ToList();
        var people = await db.Memberships.AsNoTracking().Where(m => peopleIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);

        var rows = direct
            // A direct message opened and never written in stays out of the list (L2-022 AC2).
            .Where(t => directLatest.ContainsKey(t.Id))
            .Select(t => (Thread: t, Latest: directLatest[t.Id]))
            .OrderByDescending(r => r.Latest.SentAt)
            .ThenByDescending(r => r.Latest.Id)
            .Select(r => new DirectSummaryDto(
                r.Thread.Id,
                ThreadOtherDto.Of(people[r.Thread.OtherThan(membership.Id)!.Value], photos),
                new DirectLatestDto(r.Latest.Text, r.Latest.AuthorMembershipId == membership.Id, r.Latest.SentAt),
                unread.GetValueOrDefault(r.Thread.Id)))
            .ToList();

        return new ThreadListDto(
            membership.Id,
            new EveryoneSummaryDto(
                everyone.Id,
                everyoneLatest is null
                    ? null
                    : new EveryoneLatestDto(
                        PersonName.FirstName(people[everyoneLatest.AuthorMembershipId].DisplayName),
                        everyoneLatest.Text,
                        everyoneLatest.AuthorMembershipId == membership.Id,
                        everyoneLatest.SentAt),
                unread.GetValueOrDefault(everyone.Id)),
            rows);
    }
}
