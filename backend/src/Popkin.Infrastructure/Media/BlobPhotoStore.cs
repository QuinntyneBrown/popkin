using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;

namespace Popkin.Infrastructure.Media;

/// <summary>
/// Photo files in an Azure Blob Storage container (ADR 0022), reached with the apps' managed
/// identity. The container is private: a file is read through an address the API signs and
/// serves itself (L2-051 AC2), as in Development.
/// </summary>
public sealed class BlobPhotoStore(BlobContainerClient container, PhotoUrlSigner signer) : IPhotoStore
{
    public async Task SaveAsync(string key, ReadOnlyMemory<byte> content, string contentType, CancellationToken cancellationToken) =>
        await container.GetBlobClient(key).UploadAsync(BinaryData.FromBytes(content), Options(contentType), cancellationToken);

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken) =>
        await container.GetBlobClient(key).UploadAsync(content, Options(contentType), cancellationToken);

    public async Task<StoredPhoto?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            var download = await container.GetBlobClient(key).DownloadStreamingAsync(new BlobDownloadOptions(), cancellationToken);
            return new StoredPhoto(download.Value.Content, download.Value.Details.ContentType);
        }
        catch (RequestFailedException failed) when (failed.Status == 404)
        {
            return null;
        }
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken) =>
        await container.GetBlobClient(key).DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, null, cancellationToken);

    public string GetReadUrl(string key) => signer.ReadUrl(key);

    public string GetDownloadUrl(string key, string fileName) => signer.DownloadUrl(key, fileName);

    /// <summary>A save replaces what the key held, and the file keeps its type to be served with.</summary>
    private static BlobUploadOptions Options(string contentType) =>
        new() { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } };
}
