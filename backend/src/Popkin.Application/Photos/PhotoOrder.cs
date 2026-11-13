using System.Buffers.Text;
using System.Globalization;
using System.Text;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>A photo's place in its album: when it was taken, then its id.</summary>
public readonly record struct PhotoPoint(DateTimeOffset TakenAt, Guid Id)
{
    public static PhotoPoint Of(Photo photo) => new(photo.TakenAt, photo.Id);

    /// <summary>The place as a cursor: opaque to the client, which only hands it back.</summary>
    public string ToCursor() =>
        Base64Url.EncodeToString(Encoding.ASCII.GetBytes(string.Create(CultureInfo.InvariantCulture, $"{TakenAt.UtcTicks}:{Id:N}")));

    /// <summary>The place a cursor names, or null for text that is not a cursor.</summary>
    public static PhotoPoint? FromCursor(string cursor)
    {
        if (!Base64Url.IsValid(cursor))
        {
            return null;
        }

        var parts = Encoding.ASCII.GetString(Base64Url.DecodeFromChars(cursor)).Split(':');
        if (parts.Length != 2
            || !long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
            || ticks > DateTimeOffset.MaxValue.UtcTicks
            || !Guid.TryParseExact(parts[1], "N", out var id))
        {
            return null;
        }

        return new PhotoPoint(new DateTimeOffset(ticks, TimeSpan.Zero), id);
    }
}

/// <summary>
/// The order of an album: latest taken first, by `(TakenAt, Id)`, as queries the database runs
/// through the index `(PopkinId, TakenAt, Id)`. "Previous" and "next" in the photo view follow it.
/// </summary>
public static class PhotoOrder
{
    public static IOrderedQueryable<Photo> LatestFirst(this IQueryable<Photo> photos) =>
        photos.OrderByDescending(p => p.TakenAt).ThenByDescending(p => p.Id);

    public static IOrderedQueryable<Photo> OldestFirst(this IQueryable<Photo> photos) =>
        photos.OrderBy(p => p.TakenAt).ThenBy(p => p.Id);

    /// <summary>The photos that come after the point in the album: the older ones.</summary>
    public static IQueryable<Photo> OlderThan(this IQueryable<Photo> photos, PhotoPoint point) =>
        photos.Where(p => p.TakenAt < point.TakenAt || (p.TakenAt == point.TakenAt && p.Id.CompareTo(point.Id) < 0));

    /// <summary>The photos that come before the point in the album: the newer ones.</summary>
    public static IQueryable<Photo> NewerThan(this IQueryable<Photo> photos, PhotoPoint point) =>
        photos.Where(p => p.TakenAt > point.TakenAt || (p.TakenAt == point.TakenAt && p.Id.CompareTo(point.Id) > 0));
}
