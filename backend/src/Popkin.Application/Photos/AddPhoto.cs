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

        if (request.File is null)
        {
            throw ProblemException.Invalid("validation_failed", "Choose a photo to add.", "file");
        }

        var processed = await ProcessAsync(request.File, cancellationToken);

        // Both files go under one random name, so no address can be guessed from another (L2-051 AC2).
        var id = Guid.NewGuid();
        var name = $"popkins/{popkin.Id:N}/{Guid.NewGuid():N}";
        var displayKey = $"{name}{processed.Display.Extension}";
        var thumbnailKey = $"{name}-thumbnail{processed.Thumbnail.Extension}";
        await store.SaveAsync(displayKey, processed.Display.Content, processed.Display.ContentType, cancellationToken);
        await store.SaveAsync(thumbnailKey, processed.Thumbnail.Content, processed.Thumbnail.ContentType, cancellationToken);

        var photo = Photo.Add(
            id,
            popkin.Id,
            membership.Id,
            caption.Length == 0 ? null : caption,
            processed.CapturedAt,
            clock.GetUtcNow(),
            displayKey,
            thumbnailKey,
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
            await store.DeleteAsync(displayKey, CancellationToken.None);
            await store.DeleteAsync(thumbnailKey, CancellationToken.None);
            throw;
        }

        // Told after the commit, in the same request; the event carries the id and the album read gives the photo (L2-031 AC7).
        await notifier.PhotosAdded(popkin.Id, [photo.Id]);
        return PhotoSummaryDto.Of(photo, membership, membership.Id, store);
    }

    private async Task<ProcessedAlbumPhoto> ProcessAsync(PhotoUpload upload, CancellationToken cancellationToken)
    {
        if (upload.Length > Photo.MaxFileBytes)
        {
            throw ProblemException.Invalid("photo_too_large", "A photo is at most 10 MB.", "file");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        // The type is decided from the file's own bytes, whatever its name or declared type says (L2-052 AC3).
        var processed = ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAlbumPhoto(bytes);
        return processed ?? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "file");
    }
}
