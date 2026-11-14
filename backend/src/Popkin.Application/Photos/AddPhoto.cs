using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Adds one photo to the Popkin's album, with a caption when given (L2-031).</summary>
public sealed record AddPhotoCommand(Guid PopkinId, PhotoUpload? File, string? Caption) : IRequest<PhotoSummaryDto>;

public sealed class AddPhotoCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoProcessor processor, IPhotoStore store, IPopkinNotifier notifier)
    : IRequestHandler<AddPhotoCommand, PhotoSummaryDto>
{
    public async Task<PhotoSummaryDto> Handle(AddPhotoCommand request, CancellationToken cancellationToken)
    {
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);

        // The caption is kept as typed, less the white space around it; it is never markup (L2-052 AC2).
        var caption = (request.Caption ?? "").Trim();
        if (caption.Length > Photo.MaxCaptionLength)
        {
            throw ProblemException.Invalid("caption_too_long", "A caption is at most 200 characters.", "caption");
        }

        var files = await PhotoFiles.StoreAsync(processor, store, popkin.Id, request.File, cancellationToken);
        var processed = files.Processed;
        var photo = Photo.Add(
            Guid.NewGuid(),
            popkin.Id,
            membership.Id,
            caption.Length == 0 ? null : caption,
            processed.CapturedAt,
            clock.GetUtcNow(),
            files.DisplayKey,
            files.ThumbnailKey,
            processed.Width,
            processed.Height,
            processed.Display.ContentType,
            files.OriginalKey);
        db.Photos.Add(photo);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // No photo was added, so the files belong to nothing.
            await PhotoFiles.DeleteAsync(store, files.Keys);
            throw;
        }

        // Told after the commit, in the same request; the event carries the id and the album read gives the photo (L2-031 AC7).
        await notifier.PhotosAdded(popkin.Id, [photo.Id]);
        return PhotoSummaryDto.Of(photo, membership, membership.Id, store);
    }
}
