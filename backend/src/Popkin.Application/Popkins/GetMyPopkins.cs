using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Popkins;

/// <summary>The latest message a member wrote in Everyone, as a card shows it: who and what.</summary>
public sealed record LatestMessageDto(string FirstName, string Text);

/// <summary>
/// An active Popkin as a card of My Popkins: its look, its end, how many members it has with
/// the first few as avatars, the latest message of Everyone and how many are unread by the
/// reader (L2-017 AC1, AC2). `ViewerMembershipId` is the reader's own membership.
/// </summary>
public sealed record ActivePopkinCardDto(
    Guid Id,
    string Name,
    string Emoji,
    PopkinColour Colour,
    DateTimeOffset? EndsAt,
    int MemberCount,
    IReadOnlyList<AvatarDto> Avatars,
    LatestMessageDto? LatestMessage,
    int UnreadCount,
    Guid EveryoneThreadId,
    Guid ViewerMembershipId);

/// <summary>A wrapped-up Popkin as My Popkins lists it: when it wrapped up, its people and its photos (L2-018 AC1).</summary>
public sealed record WrappedUpPopkinDto(
    Guid Id,
    string Name,
    string Emoji,
    PopkinColour Colour,
    DateTimeOffset WrappedUpAt,
    int PeopleCount,
    int PhotoCount);

public sealed record MyPopkinsDto(IReadOnlyList<ActivePopkinCardDto> Active, IReadOnlyList<WrappedUpPopkinDto> WrappedUp);

/// <summary>
/// The Popkins the caller belongs to and has not left, and no other (L2-051): the active ones,
/// the most recently active first (L2-017), then the wrapped-up ones, the most recently wrapped
/// up first (L2-018).
/// </summary>
public sealed record GetMyPopkinsQuery : IRequest<MyPopkinsDto>;

public sealed class GetMyPopkinsQueryHandler(IAppDbContext db, ICurrentPerson current, IPhotoStore photos)
    : IRequestHandler<GetMyPopkinsQuery, MyPopkinsDto>
{
    /// <summary>A card shows up to three avatars (L2-017 AC1).</summary>
    public const int MaxAvatars = 3;

    // Every read below is one query for the whole list, never one per Popkin.
    public async Task<MyPopkinsDto> Handle(GetMyPopkinsQuery request, CancellationToken cancellationToken)
    {
        var mine = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == current.PersonId && m.LeftAt == null)
            .ToDictionaryAsync(m => m.PopkinId, cancellationToken);
        if (mine.Count == 0)
        {
            return new MyPopkinsDto([], []);
        }

        var popkinIds = mine.Keys.ToList();
        var popkins = await db.Popkins.AsNoTracking().Where(p => popkinIds.Contains(p.Id)).ToListAsync(cancellationToken);
        var members = (await db.Memberships.AsNoTracking()
            .Where(m => popkinIds.Contains(m.PopkinId) && m.LeftAt == null)
            .ToListAsync(cancellationToken))
            .ToLookup(m => m.PopkinId);

        var active = popkins.Where(p => p.Status == PopkinStatus.Active).ToList();
        var wrappedUp = popkins.Where(p => p.Status == PopkinStatus.WrappedUp).ToList();
        return new MyPopkinsDto(
            active.Count == 0 ? [] : await CardsAsync(active, mine, members, cancellationToken),
            wrappedUp.Count == 0 ? [] : await WrappedUpAsync(wrappedUp, members, cancellationToken));
    }

    private async Task<IReadOnlyList<WrappedUpPopkinDto>> WrappedUpAsync(
        List<PopkinSpace> popkins, ILookup<Guid, Membership> members, CancellationToken cancellationToken)
    {
        var popkinIds = popkins.Select(p => p.Id).ToList();
        var photoCounts = await db.Photos
            .Where(p => popkinIds.Contains(p.PopkinId))
            .GroupBy(p => p.PopkinId)
            .Select(g => new { PopkinId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.PopkinId, g => g.Count, cancellationToken);

        // A wrapped-up Popkin always has the time it wrapped up (PopkinSpace.WrapUp).
        return popkins
            .OrderByDescending(p => p.WrappedUpAt)
            .ThenBy(p => p.Id)
            .Select(p => new WrappedUpPopkinDto(
                p.Id,
                p.Name,
                p.Emoji,
                p.Colour,
                p.WrappedUpAt.GetValueOrDefault(),
                members[p.Id].Count(),
                photoCounts.GetValueOrDefault(p.Id)))
            .ToList();
    }

    private async Task<IReadOnlyList<ActivePopkinCardDto>> CardsAsync(
        List<PopkinSpace> popkins, Dictionary<Guid, Membership> mine, ILookup<Guid, Membership> members, CancellationToken cancellationToken)
    {
        var popkinIds = popkins.Select(p => p.Id).ToList();
        var everyone = await db.ChatThreads.AsNoTracking()
            .Where(t => popkinIds.Contains(t.PopkinId) && t.Kind == ChatThreadKind.Everyone)
            .ToDictionaryAsync(t => t.PopkinId, t => t.Id, cancellationToken);
        var threadIds = everyone.Values.ToList();
        var messages = db.Messages.AsNoTracking().Where(m => threadIds.Contains(m.ThreadId) && m.DeletedAt == null);

        // What members wrote: the notes Popkin writes itself, such as "popped in", are left out.
        // The latest of each thread is the one no other comes after, by time and then id.
        var written = messages.Where(m => m.Kind == MessageKind.Member);
        var latest = await written
            .Where(m => !written.Any(n => n.ThreadId == m.ThreadId
                && (n.SentAt > m.SentAt || (n.SentAt == m.SentAt && n.Id.CompareTo(m.Id) > 0))))
            .ToDictionaryAsync(m => m.ThreadId, cancellationToken);

        // A member who has left still wrote their messages, so authors are read whether or not they are still in.
        var authorIds = latest.Values.Select(m => m.AuthorMembershipId).Distinct().ToList();
        var authors = await db.Memberships.AsNoTracking()
            .Where(m => authorIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.DisplayName, cancellationToken);

        var lastMessageAt = await messages
            .GroupBy(m => m.ThreadId)
            .Select(g => new { ThreadId = g.Key, At = g.Max(m => m.SentAt) })
            .ToDictionaryAsync(g => g.ThreadId, g => g.At, cancellationToken);
        var unread = await ThreadUnread.CountsAsync(
            db, threadIds, mine.Values.Select(m => m.Id).ToList(), cancellationToken);

        // Most recently active first: a Popkin was last active when it was started, when someone
        // last joined it or when its latest message was written, whichever is later.
        DateTimeOffset LastActive(PopkinSpace popkin) =>
            lastMessageAt.TryGetValue(everyone[popkin.Id], out var at) && at > popkin.LastActivityAt ? at : popkin.LastActivityAt;

        return popkins
            .OrderByDescending(LastActive)
            .ThenBy(p => p.Id)
            .Select(p =>
            {
                var threadId = everyone[p.Id];
                var inOrder = InviteMembers.InOrder(members[p.Id]).ToList();
                return new ActivePopkinCardDto(
                    p.Id,
                    p.Name,
                    p.Emoji,
                    p.Colour,
                    p.EndsAt,
                    inOrder.Count,
                    inOrder.Take(MaxAvatars).Select(m => AvatarDto.Of(m, photos)).ToList(),
                    latest.TryGetValue(threadId, out var message)
                        ? new LatestMessageDto(PersonName.FirstName(authors[message.AuthorMembershipId]), message.Text)
                        : null,
                    unread.GetValueOrDefault(threadId),
                    threadId,
                    mine[p.Id].Id);
            })
            .ToList();
    }
}
