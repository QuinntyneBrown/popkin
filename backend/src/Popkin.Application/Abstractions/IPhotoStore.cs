namespace Popkin.Application.Abstractions;

/// <summary>A stored file as it is read back.</summary>
public sealed record StoredPhoto(Stream Content, string ContentType);

/// <summary>
/// Where photo files are kept. Keys are random, so they cannot be guessed, and a file is read
/// through an address that expires (L2-051 AC2). The production provider is `&lt;TO SUPPLY&gt;`.
/// </summary>
public interface IPhotoStore
{
    Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken);

    /// <summary>Saves a file too large to hold in memory, such as the zip of an album, from where the stream stands.</summary>
    Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken);

    /// <summary>The file, or null when the key holds none.</summary>
    Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken);

    Task DeleteAsync(string key, CancellationToken cancellationToken);

    /// <summary>An address the file can be read from for a limited time.</summary>
    string GetReadUrl(string key);

    /// <summary>
    /// An address the file downloads from for a limited time, under the file name given (the
    /// response says `Content-Disposition: attachment`).
    /// </summary>
    string GetDownloadUrl(string key, string fileName);
}
