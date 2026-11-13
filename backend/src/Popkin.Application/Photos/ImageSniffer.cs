namespace Popkin.Application.Photos;

public enum ImageType
{
    Jpeg,
    Png,
    WebP,
    Heic,
}

/// <summary>
/// Decides an uploaded file's type from its leading bytes, whatever its name or declared type
/// says (L2-052 AC3). Only the four types a photo may be are recognised (L2-013 AC2).
/// </summary>
public static class ImageSniffer
{
    private static readonly string[] HeicBrands = ["heic", "heix", "mif1", "msf1"];

    public static ImageType? Sniff(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith<byte>([0xFF, 0xD8, 0xFF]))
        {
            return ImageType.Jpeg;
        }

        if (bytes.StartsWith<byte>([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        {
            return ImageType.Png;
        }

        if (bytes.Length >= 12 && bytes[..4].SequenceEqual("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
        {
            return ImageType.WebP;
        }

        if (bytes.Length >= 12 && bytes[4..8].SequenceEqual("ftyp"u8))
        {
            var brand = System.Text.Encoding.ASCII.GetString(bytes[8..12]);
            if (HeicBrands.Contains(brand))
            {
                return ImageType.Heic;
            }
        }

        return null;
    }
}
