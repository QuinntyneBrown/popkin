// Traces to: L2-013, L2-031, L2-051 (ADR 0022)
using System.Text;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Popkin.Application.Photos;
using Popkin.Infrastructure.Media;

namespace Popkin.Infrastructure.Tests.Media;

public sealed class BlobPhotoStoreTests
{
    private const string Key = "popkins/0f4c/2b9e.jpg";

    private readonly FakeContainer container = new();
    private readonly BlobPhotoStore store;

    public BlobPhotoStoreTests()
    {
        store = new BlobPhotoStore(container, new PhotoUrlSigner(new byte[32], TimeProvider.System));
    }

    [Fact]
    public async Task A_saved_photo_reads_back_with_its_bytes_and_type()
    {
        await store.SaveAsync(Key, new byte[] { 0xFF, 0xD8, 0xFF, 0x01 }, "image/jpeg", CancellationToken.None);

        var photo = await store.OpenAsync(Key, CancellationToken.None);

        Assert.NotNull(photo);
        Assert.Equal("image/jpeg", photo.ContentType);
        Assert.Equal(new byte[] { 0xFF, 0xD8, 0xFF, 0x01 }, await BytesOf(photo.Content));
    }

    [Fact]
    public async Task A_file_saved_from_a_stream_such_as_an_album_zip_reads_back_whole()
    {
        await using var zip = new MemoryStream(Encoding.ASCII.GetBytes("PK the album"));

        await store.SaveAsync("exports/album.zip", zip, "application/zip", CancellationToken.None);

        var file = await store.OpenAsync("exports/album.zip", CancellationToken.None);
        Assert.NotNull(file);
        Assert.Equal("application/zip", file.ContentType);
        Assert.Equal("PK the album", Encoding.ASCII.GetString(await BytesOf(file.Content)));
    }

    [Fact]
    public async Task A_key_that_holds_no_file_reads_as_none()
    {
        Assert.Null(await store.OpenAsync("popkins/0f4c/never-saved.jpg", CancellationToken.None));
    }

    [Fact]
    public async Task A_deleted_photo_is_gone_and_deleting_it_again_is_harmless()
    {
        await store.SaveAsync(Key, new byte[] { 1 }, "image/jpeg", CancellationToken.None);

        await store.DeleteAsync(Key, CancellationToken.None);
        await store.DeleteAsync(Key, CancellationToken.None);

        Assert.Null(await store.OpenAsync(Key, CancellationToken.None));
    }

    [Fact]
    public void A_photo_is_read_through_an_address_the_api_signs()
    {
        Assert.StartsWith($"/api/files/{Key}?expires=", store.GetReadUrl(Key));
        Assert.Contains("download=photo.jpg", store.GetDownloadUrl(Key, "photo.jpg"));
    }

    private static async Task<byte[]> BytesOf(Stream content)
    {
        await using (content)
        {
            using var copy = new MemoryStream();
            await content.CopyToAsync(copy);
            return copy.ToArray();
        }
    }

    /// <summary>A container that keeps its blobs in memory and answers as Blob Storage does: 404 for a blob it does not hold.</summary>
    private sealed class FakeContainer : BlobContainerClient
    {
        public Dictionary<string, (byte[] Content, string ContentType)> Blobs { get; } = [];

        public override BlobClient GetBlobClient(string blobName) => new FakeBlob(this, blobName);
    }

    private sealed class FakeBlob(FakeContainer container, string name) : BlobClient
    {
        public override string Name => name;

        public override async Task<Response<BlobContentInfo>> UploadAsync(Stream content, BlobUploadOptions options, CancellationToken cancellationToken = default)
        {
            using var copy = new MemoryStream();
            await content.CopyToAsync(copy, cancellationToken);
            container.Blobs[name] = (copy.ToArray(), options.HttpHeaders.ContentType);
            return Response.FromValue(BlobsModelFactory.BlobContentInfo(default, default, default, default, default, default, default), null!);
        }

        public override Task<Response<BlobContentInfo>> UploadAsync(BinaryData content, BlobUploadOptions options, CancellationToken cancellationToken = default) =>
            UploadAsync(content.ToStream(), options, cancellationToken);

        public override Task<Response<BlobDownloadStreamingResult>> DownloadStreamingAsync(BlobDownloadOptions? options = null, CancellationToken cancellationToken = default)
        {
            if (!container.Blobs.TryGetValue(name, out var blob))
            {
                throw new RequestFailedException(404, "The specified blob does not exist.", "BlobNotFound", null);
            }

            var details = BlobsModelFactory.BlobDownloadDetails(contentType: blob.ContentType, contentLength: blob.Content.Length);
            var result = BlobsModelFactory.BlobDownloadStreamingResult(new MemoryStream(blob.Content), details);
            return Task.FromResult(Response.FromValue(result, null!));
        }

        public override Task<Response<bool>> DeleteIfExistsAsync(
            DeleteSnapshotsOption snapshotsOption = DeleteSnapshotsOption.None, BlobRequestConditions? conditions = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(Response.FromValue(container.Blobs.Remove(name), null!));
    }
}
