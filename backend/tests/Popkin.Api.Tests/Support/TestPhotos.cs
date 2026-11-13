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

    /// <summary>
    /// A JPEG as a phone's camera writes it: a GPS position, the camera's make and model, an XMP
    /// packet, and when it was taken as EXIF says it (`yyyy:MM:dd HH:mm:ss`, with the offset from
    /// UTC when given). With `orientation` 6 the pixels lie on their side and EXIF says to turn them.
    /// </summary>
    public static byte[] FromAPhone(string? takenAt = null, string? offset = null, ushort? orientation = null, uint width = 800, uint height = 600)
    {
        using var image = new MagickImage(MagickColors.Teal, width, height);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Make, "Popkin");
        exif.SetValue(ExifTag.Model, "Popkin Test Phone");
        exif.SetValue(ExifTag.GPSLatitudeRef, "N");
        exif.SetValue(ExifTag.GPSLatitude, [new Rational(37), new Rational(46), new Rational(30)]);
        exif.SetValue(ExifTag.GPSLongitudeRef, "W");
        exif.SetValue(ExifTag.GPSLongitude, [new Rational(122), new Rational(25), new Rational(10)]);
        if (takenAt is not null)
        {
            exif.SetValue(ExifTag.DateTimeOriginal, takenAt);
        }

        if (offset is not null)
        {
            exif.SetValue(ExifTag.OffsetTimeOriginal, offset);
        }

        if (orientation is { } turned)
        {
            // The writer copies the image's own orientation over the profile's, so both say it.
            exif.SetValue(ExifTag.Orientation, turned);
            image.Orientation = (Orientation)turned;
        }

        image.SetProfile(exif);
        image.SetProfile(new XmpProfile(System.Text.Encoding.UTF8.GetBytes(
            "<x:xmpmeta xmlns:x=\"adobe:ns:meta/\"><rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">"
            + "<rdf:Description xmlns:exif=\"http://ns.adobe.com/exif/1.0/\" exif:GPSLatitude=\"37,46.5N\"/></rdf:RDF></x:xmpmeta>")));
        image.Format = MagickFormat.Jpeg;
        return image.ToByteArray();
    }

    public static byte[] Heic() => File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "portrait.heic"));
}
