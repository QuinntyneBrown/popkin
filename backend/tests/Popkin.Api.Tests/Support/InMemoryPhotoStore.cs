using System.Collections.Concurrent;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;

namespace Popkin.Api.Tests.Support;

/// <summary>The photo store of a test: files in memory, never on a disk or at a provider.</summary>
public sealed class InMemoryPhotoStore(PhotoUrlSigner signer) : IPhotoStore
{
    public ConcurrentDictionary<string, (byte[] Content, string ContentType)> Files { get; } = new();

    public Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken)
    {
        Files[key] = (content.ToArray(), contentType);
        return Task.CompletedTask;
    }

    public Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult(Files.TryGetValue(key, out var file) ? new StoredPhoto(new MemoryStream(file.Content), file.ContentType) : null);

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        Files.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public string GetReadUrl(string key) => signer.ReadUrl(key);
}
