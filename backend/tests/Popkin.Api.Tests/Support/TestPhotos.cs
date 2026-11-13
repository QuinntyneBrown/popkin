using ImageMagick;

namespace Popkin.Api.Tests.Support;

/// <summary>Photo files for upload tests, made in memory; the HEIC is a file a phone made.</summary>
public static class TestPhotos
{
    /// <summary>A photo of the given format that carries a GPS position and a camera model, as a phone's does.</summary>
    public static byte[] WithLocation(MagickFormat format, uint width = 800, uint height = 600)
    {
        using var image = new MagickImage(MagickColors.Teal, width, height);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Model, "Popkin Test Phone");
        exif.SetValue(ExifTag.GPSLatitudeRef, "N");
        exif.SetValue(ExifTag.GPSLatitude, [new Rational(37), new Rational(46), new Rational(30)]);
        image.SetProfile(exif);
        image.Format = format;
        return image.ToByteArray();
    }

    public static byte[] Heic() => File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "portrait.heic"));
}
