using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>A page of a thread's messages, oldest first: the latest ones (L2-027 AC5).</summary>
public sealed record GetMessagesQuery(Guid PopkinId, Guid ThreadId) : IRequest<MessagePageDto>;

public sealed class GetMessagesQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetMessagesQuery, MessagePageDto>
{
    /// <summary>A page holds at most 50 messages (L2-027 AC5).</summary>
    public const int PageSize = 50;

    public async Task<MessagePageDto> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, popkin.Id, request.ThreadId, cancellationToken);
        var messages = db.Messages.AsNoTracking().Where(m => m.ThreadId == thread.Id && m.DeletedAt == null);

        var latest = await messages.OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id).Take(PageSize + 1).ToListAsync(cancellationToken);
        var hasMore = latest.Count > PageSize;
        var items = latest.Take(PageSize).Reverse().ToList();
        return new MessagePageDto(await ToDtosAsync(items, cancellationToken), hasMore);
    }

    private async Task<List<MessageDto>> ToDtosAsync(List<Message> messages, CancellationToken cancellationToken)
    {
        // A member who has left still wrote their messages, so authors are read whether or not they are still in.
        var authorIds = messages.Select(m => m.AuthorMembershipId).Distinct().ToList();
        var authors = await db.Memberships.AsNoTracking().Where(m => authorIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        return messages.Select(m => MessageDto.Of(m, authors[m.AuthorMembershipId], photos)).ToList();
    }
}
