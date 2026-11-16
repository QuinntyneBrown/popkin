namespace Popkin.Domain;

/// <summary>What a memory keeps (L2-136): a photo, a file or a note.</summary>
public enum MemoryKind
{
    Photo,
    File,
    Note,
}

/// <summary>
/// A photo, a file or a note kept about one contact (L1-032), private to its owner. Its files are
/// in the photo store under random keys; it is never edited (known gap 107, ruled) and goes with
/// its contact.
/// </summary>
public sealed class Memory : IClientWrite
{
    /// <summary>The largest photo or file, 25 MB (L2-136 AC3).</summary>
    public const long MaxBytes = 25L * 1024 * 1024;
    public const int MaxCaptionLength = 200;
    public const int MaxNoteLength = 2000;
    public const int MaxFileNameLength = 255;

    private Memory()
    {
    }

    public Guid Id { get; private set; }

    public Guid OwnerId { get; private set; }

    public Guid ClientId { get; private set; }

    public Guid ContactId { get; private set; }

    public MemoryKind Kind { get; private set; }

    public string? Caption { get; private set; }

    /// <summary>A photo's display image, or a file as it was added.</summary>
    public string? FileKey { get; private set; }

    public string? ThumbnailKey { get; private set; }

    public string? FileName { get; private set; }

    public string? ContentType { get; private set; }

    public long? SizeBytes { get; private set; }

    public string? Text { get; private set; }

    /// <summary>A photo's day (taken, or added); a file's and a note's, the day it was added.</summary>
    public DateOnly Day { get; private set; }

    public DateTimeOffset AddedAt { get; private set; }

    /// <summary>The files this memory keeps in the photo store.</summary>
    public IEnumerable<string> Keys => new[] { FileKey, ThumbnailKey }.OfType<string>();

    public static Memory AddPhoto(
        Guid ownerId, Guid clientId, Guid contactId, string displayKey, string thumbnailKey, string? caption, DateOnly day, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = MemoryKind.Photo,
            FileKey = displayKey,
            ThumbnailKey = thumbnailKey,
            Caption = caption,
            Day = day,
            AddedAt = now,
        };

    public static Memory AddFile(
        Guid ownerId, Guid clientId, Guid contactId, string key, string fileName, string contentType, long sizeBytes, DateOnly day, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = MemoryKind.File,
            FileKey = key,
            FileName = fileName,
            ContentType = contentType,
            SizeBytes = sizeBytes,
            Day = day,
            AddedAt = now,
        };

    public static Memory AddNote(Guid ownerId, Guid clientId, Guid contactId, string text, DateOnly day, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            ClientId = clientId,
            ContactId = contactId,
            Kind = MemoryKind.Note,
            Text = text,
            Day = day,
            AddedAt = now,
        };
}
