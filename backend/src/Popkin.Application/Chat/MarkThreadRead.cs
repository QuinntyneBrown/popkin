using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// The member has the message in view: everything up to it is read (L2-027 AC4). Reading is
/// allowed in a wrapped-up Popkin, which adds nothing to it.
/// </summary>
public sealed record MarkThreadReadCommand(Guid PopkinId, Guid ThreadId, Guid? LastReadMessageId) : IRequest;

public sealed class MarkThreadReadCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPopkinNotifier notifier)
    : IRequestHandler<MarkThreadReadCommand>
{
    public async Task Handle(MarkThreadReadCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, popkin.Id, request.ThreadId, cancellationToken);
        var message = await db.Messages.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == request.LastReadMessageId && m.ThreadId == thread.Id, cancellationToken)
            ?? throw ChatProblems.MessageNotFound("lastReadMessageId");

        var now = clock.GetUtcNow();
        var state = await db.ThreadReadStates.FirstOrDefaultAsync(
            s => s.ThreadId == thread.Id && s.MembershipId == membership.Id, cancellationToken);
        if (state is null)
        {
            db.ThreadReadStates.Add(ThreadReadState.At(membership.Id, message, now));
        }
        else if (!state.Advance(message, now))
        {
            // The read point never moves backwards, and nobody is told of a move that did not happen.
            return;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException) when (state is null)
        {
            // Another device of the same member set the first read point at this moment; it tells them.
            return;
        }

        // To this person only, on every tab and device, so the count is zero everywhere.
        await notifier.ThreadRead(membership.PersonId, thread.Id);
    }
}
