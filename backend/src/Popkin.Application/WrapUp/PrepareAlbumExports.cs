using System.IO.Compression;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Prepares every album export that waits (L2-046 AC4) and removes those that expired. The
/// Worker sends it on each tick of `PrepareAlbumExportsJob`. Returns how many it prepared.
/// </summary>
public sealed record PrepareAlbumExportsCommand : IRequest<int>;

public sealed class PrepareAlbumExportsCommandHandler(
    IAppDbContext db, IPhotoStore store, TimeProvider clock, ILogger<PrepareAlbumExportsCommandHandler> logger)
    : IRequestHandler<PrepareAlbumExportsCommand, int>
{
    public async Task<int> Handle(PrepareAlbumExportsCommand request, CancellationToken cancellationToken)
    {
        await RemoveExpiredAsync(cancellationToken);

        var waiting = await db.AlbumExports
            .Where(e => e.Status == AlbumExportStatus.Preparing)
            .OrderBy(e => e.RequestedAt)
            .ToListAsync(cancellationToken);
        var prepared = 0;
        foreach (var export in waiting)
        {
            // Once stopping is asked, no new export is begun; the one in hand is finished.
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await PrepareAsync(export);
                prepared++;
            }
            catch (Exception exception)
            {
                // The export's id only: no name, no key (L2-054 AC3).
                logger.LogError(exception, "The album export {ExportId} could not be prepared", export.Id);
                export.Fail();
                await db.SaveChangesAsync(CancellationToken.None);
            }
        }

        return prepared;
    }

    /// <summary>
    /// Streams each photo's display image from the photo store into a zip, oldest first, then
    /// writes the zip back to the store. The zip is built in a temporary file, so an album is
    /// never held in memory.
    /// </summary>
    private async Task PrepareAsync(AlbumExport export)
    {
        var photos = await db.Photos.AsNoTracking()
            .Where(p => p.PopkinId == export.PopkinId)
            .OldestFirst()
            .Select(p => p.StorageKey)
            .ToListAsync(CancellationToken.None);
        export.Begin(photos.Count);
        await db.SaveChangesAsync(CancellationToken.None);

        await using var file = new FileStream(
            Path.Combine(Path.GetTempPath(), $"popkin-album-{Guid.NewGuid():N}.zip"),
            FileMode.CreateNew,
            FileAccess.ReadWrite,
            FileShare.None,
            bufferSize: 81920,
            FileOptions.DeleteOnClose | FileOptions.Asynchronous);
        using (var zip = new ZipArchive(file, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var key in photos)
            {
                var photo = await store.OpenAsync(key, CancellationToken.None)
                    ?? throw new InvalidOperationException("A photo of the album is not in the photo store.");
                await using (photo.Content)
                {
                    // Photos are compressed already; storing them as they are is as small and faster.
                    var entry = zip.CreateEntry($"{export.PhotosDone + 1:000}{Path.GetExtension(key)}", CompressionLevel.NoCompression);
                    await using var content = entry.Open();
                    await photo.Content.CopyToAsync(content, CancellationToken.None);
                }

                export.PhotoDone();
                await db.SaveChangesAsync(CancellationToken.None);
            }
        }

        file.Position = 0;
        var zipKey = $"popkins/{export.PopkinId:N}/exports/{Guid.NewGuid():N}.zip";
        await store.SaveAsync(zipKey, file, "application/zip", CancellationToken.None);
        export.Ready(zipKey, clock.GetUtcNow());
        await db.SaveChangesAsync(CancellationToken.None);
    }

    private async Task RemoveExpiredAsync(CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var expired = await db.AlbumExports
            .Where(e => e.Status == AlbumExportStatus.Ready && e.ExpiresAt <= now)
            .ToListAsync(cancellationToken);
        foreach (var export in expired)
        {
            if (export.StorageKey is { } key)
            {
                await store.DeleteAsync(key, CancellationToken.None);
            }

            db.AlbumExports.Remove(export);
        }

        if (expired.Count > 0)
        {
            await db.SaveChangesAsync(CancellationToken.None);
        }
    }
}
