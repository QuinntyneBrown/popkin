using ImageMagick;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;

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
            return Rendition(image, IPhotoProcessor.AvatarSide);
        }
        catch (MagickException)
        {
            return null;
        }
    }

    public ProcessedAlbumPhoto? MakeAlbumPhoto(ReadOnlyMemory<byte> upload)
    {
        try
        {
            using var image = new MagickImage(upload.Span);
            // When it was taken is read first: it is in the data about to be removed.
            var exif = image.GetExifProfile();
            var capturedAt = CaptureTime.Parse(
                exif?.GetValue(ExifTag.DateTimeOriginal)?.Value, exif?.GetValue(ExifTag.OffsetTimeOriginal)?.Value);
            image.AutoOrient();
            // The size it was added first, then the display image, then the thumbnail from it: each step only makes it smaller.
            var original = Rendition(image, uint.MaxValue);
            var display = Rendition(image, IPhotoProcessor.DisplaySide);
            var (width, height) = ((int)image.Width, (int)image.Height);
            var thumbnail = Rendition(image, IPhotoProcessor.ThumbnailSide);
            return new ProcessedAlbumPhoto(display, thumbnail, width, height, capturedAt, original);
        }
        catch (MagickException)
        {
            return null;
        }
    }

    /// <summary>The image as a JPEG no side of which is longer than `side`, with nothing but its pixels.</summary>
    private static ProcessedPhoto Rendition(MagickImage image, uint side)
    {
        if (image.Width > side || image.Height > side)
        {
            image.Resize(side, side);
        }

        image.Strip();
        image.Format = MagickFormat.Jpeg;
        image.Quality = Quality;
        return new ProcessedPhoto(image.ToByteArray(), "image/jpeg", ".jpg");
    }
}
