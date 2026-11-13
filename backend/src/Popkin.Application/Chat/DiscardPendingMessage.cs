using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// "Delete" on a message whose send failed: the server may hold it with the answer lost, so the
/// caller's message with that client message id is deleted if there is one (L2-028 AC1). It
/// succeeds whatever the server holds, and changes nothing in a wrapped-up Popkin (L2-045 AC2).
/// </summary>
public sealed record DiscardPendingMessageCommand(Guid PopkinId, Guid ThreadId, Guid ClientMessageId) : IRequest;

public sealed class DiscardPendingMessageCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPopkinNotifier notifier)
    : IRequestHandler<DiscardPendingMessageCommand>
{
    public async Task Handle(DiscardPendingMessageCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, request.ThreadId, cancellationToken);
        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            return;
        }

        // The author's own message only: another member's client message id finds nothing.
        var message = await db.Messages.FirstOrDefaultAsync(
            m => m.ThreadId == thread.Id && m.AuthorMembershipId == membership.Id && m.ClientMessageId == request.ClientMessageId && m.DeletedAt == null,
            cancellationToken);
        if (message is null)
        {
            return;
        }

        message.Delete(clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        await notifier.MessageDeleted(popkin.Id, thread.Id, message.Id);
    }
}
