using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>The photo a message carries: its display image at an expiring address (L2-051 AC2) and its size, so the thread keeps its place while it loads.</summary>
public sealed record ChatPhotoDto(Guid Id, string Url, int Width, int Height)
{
    public static ChatPhotoDto Of(Photo photo, IPhotoStore store) => new(photo.Id, store.GetReadUrl(photo.StorageKey), photo.Width, photo.Height);
}

/// <summary>
/// Uploads the photo a message of the thread will carry (L2-026), with the limits of the album
/// (L2-031 AC2, AC6). It is in no album and on no message until the uploader sends it.
/// </summary>
public sealed record UploadThreadPhotoCommand(Guid PopkinId, Guid ThreadId, PhotoUpload? File) : IRequest<ChatPhotoDto>;

public sealed class UploadThreadPhotoCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoProcessor processor, IPhotoStore store)
    : IRequestHandler<UploadThreadPhotoCommand, ChatPhotoDto>
{
    public async Task<ChatPhotoDto> Handle(UploadThreadPhotoCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        // A direct message of two others is the same as no thread (L2-023 AC2).
        var thread = await ChatThreads.RequireAsync(db, membership, request.ThreadId, cancellationToken);

        var files = await PhotoFiles.StoreAsync(processor, store, popkin.Id, request.File, cancellationToken);
        var processed = files.Processed;
        var photo = Photo.ForThread(
            Guid.NewGuid(),
            popkin.Id,
            thread.Id,
            membership.Id,
            processed.CapturedAt,
            clock.GetUtcNow(),
            files.DisplayKey,
            files.ThumbnailKey,
            processed.Width,
            processed.Height,
            processed.Display.ContentType);
        db.Photos.Add(photo);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // No photo was added, so the files belong to nothing.
            await PhotoFiles.DeleteAsync(store, files.DisplayKey, files.ThumbnailKey);
            throw;
        }

        return ChatPhotoDto.Of(photo, store);
    }
}
