using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>The three files of a photo, stored: the keys of the display image, the thumbnail and the size it was added, and what was read of the upload.</summary>
public sealed record StoredPhotoFiles(string DisplayKey, string ThumbnailKey, string OriginalKey, ProcessedAlbumPhoto Processed)
{
    public IEnumerable<string> Keys => [DisplayKey, ThumbnailKey, OriginalKey];
}

/// <summary>
/// An uploaded photo, checked and stored, for the album and for a message alike: the limits of
/// L2-031 AC2, the type decided from the file's own bytes (L2-052 AC3), and the location and
/// device data removed before anything is stored (L2-031 AC6).
/// </summary>
public static class PhotoFiles
{
    public static async Task<StoredPhotoFiles> StoreAsync(
        IPhotoProcessor processor, IPhotoStore store, Guid popkinId, PhotoUpload? upload, CancellationToken cancellationToken)
    {
        if (upload is null)
        {
            throw ProblemException.Invalid("validation_failed", "Choose a photo to add.", "file");
        }

        if (upload.Length > Photo.MaxFileBytes)
        {
            throw ProblemException.Invalid("photo_too_large", "A photo is at most 10 MB.", "file");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        // The type is decided from the file's own bytes, whatever its name or declared type says (L2-052 AC3).
        var processed = (ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAlbumPhoto(bytes))
            ?? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "file");

        // The files go under one random name, so no address can be guessed from another (L2-051 AC2).
        var name = $"popkins/{popkinId:N}/{Guid.NewGuid():N}";
        var files = new StoredPhotoFiles(
            $"{name}{processed.Display.Extension}", $"{name}-thumbnail{processed.Thumbnail.Extension}", $"{name}-original{processed.Original.Extension}", processed);
        await store.SaveAsync(files.DisplayKey, processed.Display.Content, processed.Display.ContentType, cancellationToken);
        await store.SaveAsync(files.ThumbnailKey, processed.Thumbnail.Content, processed.Thumbnail.ContentType, cancellationToken);
        await store.SaveAsync(files.OriginalKey, processed.Original.Content, processed.Original.ContentType, cancellationToken);
        return files;
    }

    /// <summary>The keys of every file a photo has: a photo stored before Popkin kept the size it was added has two.</summary>
    public static IEnumerable<string> KeysOf(Photo photo) =>
        photo.OriginalKey is { } original ? [photo.StorageKey, photo.ThumbnailKey, original] : [photo.StorageKey, photo.ThumbnailKey];

    /// <summary>Deletes the files given; deleting a file twice is harmless.</summary>
    public static async Task DeleteAsync(IPhotoStore store, IEnumerable<string> keys)
    {
        foreach (var key in keys)
        {
            await store.DeleteAsync(key, CancellationToken.None);
        }
    }
}
