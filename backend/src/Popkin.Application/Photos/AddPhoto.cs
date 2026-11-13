using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Adds one photo to the Popkin's album, with a caption when given (L2-031).</summary>
public sealed record AddPhotoCommand(Guid PopkinId, PhotoUpload? File, string? Caption) : IRequest<PhotoSummaryDto>;

public sealed class AddPhotoCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoProcessor processor, IPhotoStore store)
    : IRequestHandler<AddPhotoCommand, PhotoSummaryDto>
{
    public async Task<PhotoSummaryDto> Handle(AddPhotoCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);

        // The caption is kept as typed, less the white space around it; it is never markup (L2-052 AC2).
        var caption = (request.Caption ?? "").Trim();
        var processed = await ProcessAsync(request.File!, cancellationToken);

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
        await db.SaveChangesAsync(cancellationToken);

        return PhotoSummaryDto.Of(photo, membership, membership.Id, store);
    }

    private async Task<ProcessedAlbumPhoto> ProcessAsync(PhotoUpload upload, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        return processor.MakeAlbumPhoto(buffer.ToArray())!;
    }
}
