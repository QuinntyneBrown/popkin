using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>
/// "Delete photo": the member who added it, or the Host for a photo of the album, deletes it for
/// everyone (L2-036 AC2). In one unit of work its reactions and comments go, every message that
/// carried it reads "Photo removed" (AC3), and the photo goes; then its files leave the store and
/// its audience is told. Nothing changes in a wrapped-up Popkin (L2-045 AC2).
/// </summary>
public sealed record DeletePhotoCommand(Guid PopkinId, Guid PhotoId) : IRequest;

public sealed class DeletePhotoCommandHandler(
    IAppDbContext db, IMembershipGuard guard, IPhotoStore store, IPopkinNotifier notifier, ILogger<DeletePhotoCommandHandler> logger)
    : IRequestHandler<DeletePhotoCommand>
{
    public async Task Handle(DeletePhotoCommand request, CancellationToken cancellationToken)
    {
        var target = await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken);
        var photo = target.Photo;
        if (!photo.CanBeDeletedBy(target.Membership))
        {
            throw new ProblemException(403, "photo_not_yours", "Only the member who added this photo, or the Host, can delete it.");
        }

        PhotoAccess.RequireActive(target);
        // Who is told: everyone for a photo of the album, the two members for a direct message's.
        var audience = await AudienceAsync(photo, cancellationToken);

        db.PhotoReactions.RemoveRange(await db.PhotoReactions.Where(r => r.PhotoId == photo.Id).ToListAsync(cancellationToken));
        db.PhotoComments.RemoveRange(await db.PhotoComments.Where(c => c.PhotoId == photo.Id).ToListAsync(cancellationToken));
        foreach (var message in await db.Messages.Where(m => m.PhotoId == photo.Id).ToListAsync(cancellationToken))
        {
            message.RemovePhoto();
        }

        db.Photos.Remove(photo);
        await db.SaveChangesAsync(cancellationToken);

        // After the commit: a file left behind is harmless, a photo without its files is not.
        try
        {
            await PhotoFiles.DeleteAsync(store, photo.StorageKey, photo.ThumbnailKey);
        }
        catch (Exception exception)
        {
            // Logged by the photo's id, never anything of its content (L2-054 AC3). The files stay
            // in the store, reached by no address that is still signed (a known gap: no sweep of them yet).
            logger.LogWarning(exception, "The files of the deleted photo {PhotoId} could not be deleted", photo.Id);
        }

        await notifier.PhotoDeleted(audience, photo.Id);
    }

    private async Task<Audience> AudienceAsync(Photo photo, CancellationToken cancellationToken)
    {
        if (photo.InAlbum || photo.ThreadId is not { } threadId)
        {
            return Audience.Popkin(photo.PopkinId);
        }

        var thread = await db.ChatThreads.AsNoTracking().FirstAsync(t => t.Id == threadId, cancellationToken);
        return await ChatThreads.AudienceAsync(db, thread, cancellationToken);
    }
}
