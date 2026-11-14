using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>A message as the Chat card of the Popkin home shows it: who, what and when.</summary>
public sealed record ChatPreviewMessageDto(Guid Id, MessageAuthorDto Author, string Text, DateTimeOffset SentAt);

/// <summary>
/// The Chat card of the Popkin home: the latest messages members wrote in Everyone, oldest
/// first, and how many messages are new to the reader (L2-019 AC3).
/// </summary>
public sealed record ChatPreviewDto(Guid ThreadId, IReadOnlyList<ChatPreviewMessageDto> Messages, int NewCount);

/// <summary>The preview of a Popkin's Everyone thread, for any of its members (L2-019 AC3, L2-051 AC1).</summary>
public sealed record GetEveryonePreviewQuery(Guid PopkinId) : IRequest<ChatPreviewDto>;

public sealed class GetEveryonePreviewQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetEveryonePreviewQuery, ChatPreviewDto>
{
    /// <summary>The most messages a preview holds.</summary>
    public const int MaxMessages = 4;

    public async Task<ChatPreviewDto> Handle(GetEveryonePreviewQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.EveryoneAsync(db, popkin.Id, cancellationToken);

        // What members wrote: the notes Popkin writes itself, such as "popped in", are left out.
        var latest = await db.Messages.AsNoTracking()
            .Where(m => m.ThreadId == thread.Id && m.DeletedAt == null && m.Kind == MessageKind.Member)
            .Newest()
            .Take(MaxMessages)
            .ToListAsync(cancellationToken);
        latest.Reverse();

        // A member who has left still wrote their messages, so authors are read whether or not they are still in.
        var authorIds = latest.Select(m => m.AuthorMembershipId).Distinct().ToList();
        var authors = await db.Memberships.AsNoTracking().Where(m => authorIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var unread = await ThreadUnread.OfAsync(db, thread.Id, membership.Id, cancellationToken);

        return new ChatPreviewDto(
            thread.Id,
            latest.Select(m => new ChatPreviewMessageDto(m.Id, MessageDto.Of(m, authors[m.AuthorMembershipId], photos).Author, MessagePreview.TextOf(m), m.SentAt)).ToList(),
            unread.Count);
    }
}
