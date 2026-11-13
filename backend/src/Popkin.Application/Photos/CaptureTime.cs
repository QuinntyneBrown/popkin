using System.Globalization;

namespace Popkin.Application.Photos;

/// <summary>
/// When a photo was taken, as its file says it. EXIF writes the time as the camera's clock
/// showed it (`yyyy:MM:dd HH:mm:ss`) and, in newer files, that clock's offset from UTC
/// (`+02:00`) beside it. A time with no usable offset is read as UTC; a time that cannot be
/// read is no time at all.
/// </summary>
public static class CaptureTime
{
    public static DateTimeOffset? Parse(string? dateTime, string? offset)
    {
        if (!DateTime.TryParseExact(
                dateTime?.Trim(), "yyyy:MM:dd HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var local))
        {
            return null;
        }

        try
        {
            return new DateTimeOffset(local, ParseOffset(offset));
        }
        catch (ArgumentOutOfRangeException)
        {
            // The first or the last day of the calendar, pushed past its end by the offset.
            return null;
        }
    }

    private static TimeSpan ParseOffset(string? offset)
    {
        var text = offset?.Trim() ?? "";
        if (text.Length != 6 || text[0] is not ('+' or '-')
            || !TimeSpan.TryParseExact(text[1..], @"hh\:mm", CultureInfo.InvariantCulture, out var size)
            || size > TimeSpan.FromHours(14))
        {
            return TimeSpan.Zero;
        }

        return text[0] == '-' ? -size : size;
    }
}
