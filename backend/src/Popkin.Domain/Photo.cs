namespace Popkin.Domain;

/// <summary>
/// A photo of a Popkin, added by one member to its album or uploaded for a message of one of its
/// threads (L2-026). The database holds its facts and the keys of its two stored files, the
/// display image and the thumbnail; the files themselves are in the photo store, without
/// location or device data (L2-031 AC6).
/// </summary>
public sealed class Photo
{
    /// <summary>A caption is at most 200 characters (L2-031 AC3).</summary>
    public const int MaxCaptionLength = 200;

    /// <summary>A photo file is at most 10 MB (L2-031 AC2).</summary>
    public const long MaxFileBytes = 10 * 1024 * 1024;

    private Photo()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public Guid UploaderMembershipId { get; private set; }

    public string? Caption { get; private set; }

    /// <summary>When it was taken, as its file said, or when it was added. The album is ordered by it.</summary>
    public DateTimeOffset TakenAt { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }

    /// <summary>The photo store key of the display image.</summary>
    public string StorageKey { get; private set; } = "";

    /// <summary>The photo store key of the thumbnail.</summary>
    public string ThumbnailKey { get; private set; } = "";

    /// <summary>The width of the display image, turned upright.</summary>
    public int Width { get; private set; }

    public int Height { get; private set; }

    /// <summary>The type of both stored files.</summary>
    public string ContentType { get; private set; } = "";

    /// <summary>The thread it was uploaded for, to go with a message; null for a photo added to the album.</summary>
    public Guid? ThreadId { get; private set; }

    /// <summary>
    /// Whether it is in the album: a photo added to the album is, and a photo of a message in
    /// Everyone joins it when its message is sent; a photo of a direct message never does (L2-026 AC3).
    /// </summary>
    public bool InAlbum { get; private set; }

    /// <summary>
    /// Adds a photo now. A capture time later than now is a camera clock that is wrong: the photo
    /// is never put in the future, so it counts as taken when it was added.
    /// </summary>
    public static Photo Add(
        Guid id,
        Guid popkinId,
        Guid uploaderMembershipId,
        string? caption,
        DateTimeOffset? capturedAt,
        DateTimeOffset now,
        string storageKey,
        string thumbnailKey,
        int width,
        int height,
        string contentType) => new()
    {
        Id = id,
        PopkinId = popkinId,
        UploaderMembershipId = uploaderMembershipId,
        Caption = caption,
        TakenAt = capturedAt is { } captured && captured < now ? captured : now,
        AddedAt = now,
        StorageKey = storageKey,
        ThumbnailKey = thumbnailKey,
        Width = width,
        Height = height,
        ContentType = contentType,
        InAlbum = true,
    };

    /// <summary>
    /// A photo uploaded for a message of a thread (L2-026): in no album until its message is
    /// sent, and then only when the thread is Everyone. It has no caption; its message has the text.
    /// </summary>
    public static Photo ForThread(
        Guid id,
        Guid popkinId,
        Guid threadId,
        Guid uploaderMembershipId,
        DateTimeOffset? capturedAt,
        DateTimeOffset now,
        string storageKey,
        string thumbnailKey,
        int width,
        int height,
        string contentType)
    {
        var photo = Add(id, popkinId, uploaderMembershipId, null, capturedAt, now, storageKey, thumbnailKey, width, height, contentType);
        photo.ThreadId = threadId;
        photo.InAlbum = false;
        return photo;
    }

    /// <summary>
    /// The photo's message was sent in Everyone: it joins the album under its uploader, as added
    /// now (L2-026 AC3). Joining twice changes nothing.
    /// </summary>
    public void JoinAlbum(DateTimeOffset now)
    {
        if (!InAlbum)
        {
            InAlbum = true;
            AddedAt = now;
        }
    }
}
