namespace Popkin.Domain;

public enum AlbumExportStatus
{
    Preparing,
    Ready,
    Failed,
}

/// <summary>
/// A zip of every photo of a wrapped-up Popkin, prepared when a member asks to save the album
/// and downloaded once ready (L2-046 AC4). It is kept for a day, then prepared afresh.
/// </summary>
public sealed class AlbumExport
{
    /// <summary>How long a ready export can be downloaded.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(24);

    private AlbumExport()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public Guid RequestedByMembershipId { get; private set; }

    public AlbumExportStatus Status { get; private set; }

    public int PhotosTotal { get; private set; }

    public int PhotosDone { get; private set; }

    /// <summary>The photo store key of the zip, once it is ready.</summary>
    public string? StorageKey { get; private set; }

    public DateTimeOffset RequestedAt { get; private set; }

    public DateTimeOffset? ExpiresAt { get; private set; }

    public static AlbumExport Request(Guid popkinId, Guid requestedByMembershipId, int photosTotal, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        RequestedByMembershipId = requestedByMembershipId,
        Status = AlbumExportStatus.Preparing,
        PhotosTotal = photosTotal,
        RequestedAt = now,
    };

    /// <summary>Whether a member who asks for the album now is given this export: it is being prepared, or is ready and has not expired.</summary>
    public bool CanBeUsedAt(DateTimeOffset now) =>
        Status == AlbumExportStatus.Preparing || (Status == AlbumExportStatus.Ready && !HasExpiredAt(now));

    public bool HasExpiredAt(DateTimeOffset now) => ExpiresAt is { } expiresAt && expiresAt <= now;

    /// <summary>The preparing starts, or starts again after it was cut short, with this many photos to do.</summary>
    public void Begin(int photosTotal)
    {
        PhotosTotal = photosTotal;
        PhotosDone = 0;
    }

    /// <summary>One more photo is in the zip.</summary>
    public void PhotoDone() => PhotosDone++;

    /// <summary>The zip is in the photo store and can be downloaded for a day.</summary>
    public void Ready(string storageKey, DateTimeOffset now)
    {
        Status = AlbumExportStatus.Ready;
        StorageKey = storageKey;
        ExpiresAt = now + Lifetime;
    }

    public void Fail() => Status = AlbumExportStatus.Failed;
}
