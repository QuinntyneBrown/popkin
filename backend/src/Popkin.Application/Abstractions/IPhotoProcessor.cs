namespace Popkin.Application.Abstractions;

/// <summary>A photo ready to store: its bytes and their type.</summary>
public sealed record ProcessedPhoto(ReadOnlyMemory<byte> Content, string ContentType, string Extension);

/// <summary>Turns an uploaded image into what Popkin stores.</summary>
public interface IPhotoProcessor
{
    /// <summary>
    /// A member's avatar from an uploaded image: turned upright, no side longer than
    /// <see cref="AvatarSide"/> px, with its location and device data removed (L2-054). Null when
    /// the bytes do not decode as an image.
    /// </summary>
    ProcessedPhoto? MakeAvatar(ReadOnlyMemory<byte> upload);

    const int AvatarSide = 512;
}
