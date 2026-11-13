using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Experiences;

/// <summary>
/// The picture of an experience. It keeps the limits of a photo (L2-040 AC3, L2-031 AC2) and
/// goes through the same processing and the same store: a display image and a thumbnail,
/// without location or device data (L2-031 AC6). It is not a photo of the album.
/// </summary>
public static class ExperiencePictures
{
    /// <summary>The upload as the two images to store; a refusal names the field `picture`.</summary>
    public static async Task<ProcessedAlbumPhoto> ReadAsync(IPhotoProcessor processor, PhotoUpload upload, CancellationToken cancellationToken)
    {
        if (upload.Length > Photo.MaxFileBytes)
        {
            throw ProblemException.Invalid("picture_too_large", "A picture is at most 10 MB.", "picture");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        // The type is decided from the file's own bytes, whatever its name or declared type says (L2-052 AC3).
        var processed = ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAlbumPhoto(bytes);
        return processed
            ?? throw ProblemException.Invalid("picture_type_not_allowed", "A picture must be a JPEG, PNG, WebP or HEIC image.", "picture");
    }

    /// <summary>Stores both images under one random name, so no address can be guessed from another (L2-051 AC2).</summary>
    public static async Task<ExperiencePicture> SaveAsync(IPhotoStore store, Guid popkinId, ProcessedAlbumPhoto processed, CancellationToken cancellationToken)
    {
        var name = $"popkins/{popkinId:N}/experiences/{Guid.NewGuid():N}";
        var picture = new ExperiencePicture($"{name}{processed.Display.Extension}", $"{name}-thumbnail{processed.Thumbnail.Extension}");
        await store.SaveAsync(picture.Key, processed.Display.Content, processed.Display.ContentType, cancellationToken);
        await store.SaveAsync(picture.ThumbnailKey, processed.Thumbnail.Content, processed.Thumbnail.ContentType, cancellationToken);
        return picture;
    }

    public static async Task DeleteAsync(IPhotoStore store, ExperiencePicture? picture)
    {
        if (picture is not null)
        {
            await store.DeleteAsync(picture.Key, CancellationToken.None);
            await store.DeleteAsync(picture.ThumbnailKey, CancellationToken.None);
        }
    }
}
