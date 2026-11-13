using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;

namespace Popkin.Application.Photos;

/// <summary>
/// A photo of a person, for joining (L2-013 AC2) or their account (L2-048 AC2): at most 10 MB,
/// a JPEG, PNG, WebP or HEIC by its leading bytes, whatever it is called (L2-052 AC3), made small
/// and stripped of location and device data. It is not added to any album.
/// </summary>
public static class AvatarPhotos
{
    public const long MaxBytes = 10 * 1024 * 1024;

    public static async Task<ProcessedPhoto> ReadAsync(PhotoUpload upload, IPhotoProcessor processor, CancellationToken cancellationToken)
    {
        if (upload.Length > MaxBytes)
        {
            throw ProblemException.Invalid("photo_too_large", "A photo is at most 10 MB.", "photo");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var avatar = ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAvatar(bytes);
        return avatar ?? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "photo");
    }

    /// <summary>A random key of its own, so the file cannot be guessed.</summary>
    public static string NewKey(ProcessedPhoto avatar) => $"avatars/{Guid.NewGuid():N}{avatar.Extension}";
}
