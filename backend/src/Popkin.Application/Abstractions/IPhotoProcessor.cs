namespace Popkin.Application.Abstractions;

/// <summary>A photo ready to store: its bytes and their type.</summary>
public sealed record ProcessedPhoto(ReadOnlyMemory<byte> Content, string ContentType, string Extension);

/// <summary>
/// A photo of the album ready to store: the display image and the thumbnail made from one
/// upload, the photo at the size it was added (for "Save photo", L2-036 AC1), the size of the
/// display image and, when the upload said so, when it was taken.
/// </summary>
public sealed record ProcessedAlbumPhoto(
    ProcessedPhoto Display, ProcessedPhoto Thumbnail, int Width, int Height, DateTimeOffset? CapturedAt, ProcessedPhoto Original);

/// <summary>Turns an uploaded image into what Popkin stores.</summary>
public interface IPhotoProcessor
{
    /// <summary>
    /// A member's avatar from an uploaded image: turned upright, no side longer than
    /// <see cref="AvatarSide"/> px, with its location and device data removed (L2-054). Null when
    /// the bytes do not decode as an image.
    /// </summary>
    ProcessedPhoto? MakeAvatar(ReadOnlyMemory<byte> upload);

    /// <summary>
    /// A photo of the album from an uploaded image: a display image no side of which is longer
    /// than <see cref="DisplaySide"/> px and a thumbnail no side of which is longer than
    /// <see cref="ThumbnailSide"/> px, both turned upright, never enlarged, and the photo at the
    /// size it was added, turned upright, all three re-encoded as JPEG with their location and
    /// device data removed (L2-031 AC6, L2-036 AC1, L2-055 AC4). The upload itself is not kept.
    /// Null when the bytes do not decode as an image.
    /// </summary>
    ProcessedAlbumPhoto? MakeAlbumPhoto(ReadOnlyMemory<byte> upload);

    const int AvatarSide = 512;

    const int DisplaySide = 2048;

    const int ThumbnailSide = 480;
}
