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

    /// <summary>The file, or null when the key holds none.</summary>
    Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken);

    Task DeleteAsync(string key, CancellationToken cancellationToken);

    /// <summary>An address the file can be read from for a limited time.</summary>
    string GetReadUrl(string key);
}
