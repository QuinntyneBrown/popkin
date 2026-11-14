using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// "Delete" in "Message actions": the author removes their message for everyone in the thread
/// (L2-024). Its text is not kept and its reactions go with it; a reply to it keeps its link,
/// and its quote reads deleted (L2-025 AC4). A photo it carried that is in the album stays
/// there, added under its sender; one of a direct message goes from the photo store with it
/// (L2-026). Nothing changes in a wrapped-up Popkin (L2-045 AC2).
/// </summary>
public sealed record DeleteMessageCommand(Guid PopkinId, Guid ThreadId, Guid MessageId) : IRequest;

public sealed class DeleteMessageCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store, IPopkinNotifier notifier)
    : IRequestHandler<DeleteMessageCommand>
{
    public async Task Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, request.ThreadId, cancellationToken);
        var message = await ChatThreads.RequireMessageAsync(db, thread, request.MessageId, cancellationToken);
        if (!message.CanBeDeletedBy(membership))
        {
            throw new ProblemException(403, "not_message_author", "Only the member who wrote this can delete it.");
        }

        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw MembershipGuard.WrappedUp();
        }

        message.Delete(clock.GetUtcNow());
        db.MessageReactions.RemoveRange(await db.MessageReactions.Where(r => r.MessageId == message.Id).ToListAsync(cancellationToken));
        var removed = await ChatPhotos.RemoveWithAsync(db, message, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await ChatPhotos.DeleteFilesAsync(store, removed);

        await notifier.MessageDeleted(await ChatThreads.AudienceAsync(db, thread, cancellationToken), thread.Id, message.Id);
    }
}
