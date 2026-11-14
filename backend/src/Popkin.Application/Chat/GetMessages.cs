using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// A page of a thread's messages, oldest first (L2-027 AC5). With no cursor it is the latest
/// page; `Before` and `After` read the page next to a message; `From` and `To` together read
/// the whole window between two messages, both included, which is the recovery read for what
/// is already on screen.
/// </summary>
public sealed record GetMessagesQuery(Guid PopkinId, Guid ThreadId, Guid? Before = null, Guid? After = null, Guid? From = null, Guid? To = null, int? Limit = null)
    : IRequest<MessagePageDto>;

public sealed class GetMessagesQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore photos)
    : IRequestHandler<GetMessagesQuery, MessagePageDto>
{
    /// <summary>A page holds at most 50 messages (L2-027 AC5).</summary>
    public const int PageSize = 50;

    public async Task<MessagePageDto> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var (_, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, request.ThreadId, cancellationToken);
        var messages = db.Messages.AsNoTracking().Where(m => m.ThreadId == thread.Id && m.DeletedAt == null);
        var limit = request.Limit is > 0 and <= PageSize ? request.Limit.Value : PageSize;

        if (request.From is { } fromId && request.To is { } toId)
        {
            var from = await CursorAsync(thread.Id, fromId, "from", cancellationToken);
            var to = await CursorAsync(thread.Id, toId, "to", cancellationToken);
            var window = await messages.From(from).UpTo(to).Oldest().ToListAsync(cancellationToken);
            return new MessagePageDto(await ToDtosAsync(window, cancellationToken), HasMore: false);
        }

        if (request.After is { } afterId)
        {
            var after = await CursorAsync(thread.Id, afterId, "after", cancellationToken);
            var newer = await messages.After(after).Oldest().Take(limit + 1).ToListAsync(cancellationToken);
            return new MessagePageDto(await ToDtosAsync(newer.Take(limit).ToList(), cancellationToken), newer.Count > limit);
        }

        if (request.Before is { } beforeId)
        {
            messages = messages.Before(await CursorAsync(thread.Id, beforeId, "before", cancellationToken));
        }

        // The page is kept in the order the database gave it: it alone decides how two ids compare.
        var older = await messages.Newest().Take(limit + 1).ToListAsync(cancellationToken);
        var page = older.Take(limit).Reverse().ToList();
        return new MessagePageDto(await ToDtosAsync(page, cancellationToken), older.Count > limit);
    }

    /// <summary>The message a cursor names. A deleted message still marks its place.</summary>
    private async Task<MessagePoint> CursorAsync(Guid threadId, Guid messageId, string field, CancellationToken cancellationToken)
    {
        var message = await db.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == messageId && m.ThreadId == threadId, cancellationToken)
            ?? throw ChatProblems.MessageNotFound(field);
        return new MessagePoint(message.SentAt, message.Id);
    }

    private async Task<List<MessageDto>> ToDtosAsync(List<Message> messages, CancellationToken cancellationToken)
    {
        // A member who has left still wrote their messages, so authors are read whether or not they are still in.
        var authorIds = messages.Select(m => m.AuthorMembershipId).Distinct().ToList();
        var authors = await db.Memberships.AsNoTracking().Where(m => authorIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var reactions = await Reactions.OfAsync(db, messages.Select(m => m.Id).ToList(), cancellationToken);
        var quotes = await Quotes.OfAsync(db, messages, cancellationToken);
        return messages.Select(m => MessageDto.Of(m, authors[m.AuthorMembershipId], photos, reactions.GetValueOrDefault(m.Id), quotes.GetValueOrDefault(m.Id))).ToList();
    }
}
