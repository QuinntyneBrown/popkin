using Popkin.Application.Abstractions;
using Popkin.Application.Photos;

namespace Popkin.Infrastructure.Media;

/// <summary>
/// Development only: photo files in a folder on this machine (`Photos:Root`), read through
/// addresses the API signs itself, because the photo store provider is `&lt;TO SUPPLY&gt;`.
/// </summary>
public sealed class LocalPhotoStore(string root, PhotoUrlSigner signer) : IPhotoStore
{
    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp",
        [".zip"] = "application/zip",
    };

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken)
    {
        var path = PathOf(key) ?? throw new ArgumentException("The key is not a file name.", nameof(key));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var file = File.Create(path);
        await content.CopyToAsync(file, cancellationToken);
    }

    public async Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken)
    {
        var path = PathOf(key) ?? throw new ArgumentException("The key is not a file name.", nameof(key));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content, cancellationToken);
    }

    public Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        var path = PathOf(key);
        var found = path is not null && File.Exists(path) && ContentTypes.TryGetValue(Path.GetExtension(path), out _);
        return Task.FromResult(found ? new StoredPhoto(File.OpenRead(path!), ContentTypes[Path.GetExtension(path!)]) : null);
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        if (PathOf(key) is { } path)
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    public string GetReadUrl(string key) => signer.ReadUrl(key);

    public string GetDownloadUrl(string key, string fileName) => signer.DownloadUrl(key, fileName);

    /// <summary>The file of a key, or null for a key that would leave the root folder.</summary>
    private string? PathOf(string key)
    {
        var full = Path.GetFullPath(Path.Combine(root, key));
        var folder = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
        return full.StartsWith(folder, StringComparison.Ordinal) ? full : null;
    }
}

/// <summary>Where no photo store is configured, no photo can be kept or read.</summary>
public sealed class UnconfiguredPhotoStore : IPhotoStore
{
    public Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("No photo store is configured.");

    public Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken) => Task.FromResult<StoredPhoto?>(null);

    public Task DeleteAsync(string key, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("No photo store is configured.");

    public string GetReadUrl(string key) => throw new InvalidOperationException("No photo store is configured.");

    public string GetDownloadUrl(string key, string fileName) => throw new InvalidOperationException("No photo store is configured.");
}
