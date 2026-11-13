using ImageMagick;
using Popkin.Application.Abstractions;

namespace Popkin.Infrastructure.Media;

/// <summary>
/// Image work with Magick.NET (ImageMagick), which decodes JPEG, PNG, WebP and HEIC. A photo is
/// re-encoded as JPEG, which every browser shows, and every profile it carried (EXIF with its
/// location and device data, XMP, IPTC) is removed before it is stored (L2-054).
/// </summary>
public sealed class MagickPhotoProcessor : IPhotoProcessor
{
    private const uint Quality = 85;

    public ProcessedPhoto? MakeAvatar(ReadOnlyMemory<byte> upload)
    {
        try
        {
            using var image = new MagickImage(upload.Span);
            // Turn it upright first: the orientation is in the data about to be removed.
            image.AutoOrient();
            const uint side = IPhotoProcessor.AvatarSide;
            if (image.Width > side || image.Height > side)
            {
                image.Resize(side, side);
            }

            image.Strip();
            image.Format = MagickFormat.Jpeg;
            image.Quality = Quality;
            return new ProcessedPhoto(image.ToByteArray(), "image/jpeg", ".jpg");
        }
        catch (MagickException)
        {
            return null;
        }
    }
}
