using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// Removes the photos of every Popkin that wrapped up without its album 30 days ago or more
/// (L2-045 AC4): the files, the photos (those of chat with them) and any export of them. The pictures of experiences
/// stay. The Worker sends it on each tick of `RemovePhotosOfWrappedUpPopkinsJob`. Returns how
/// many albums it removed.
/// </summary>
public sealed record RemoveWrappedUpAlbumsCommand : IRequest<int>;

public sealed class RemoveWrappedUpAlbumsCommandHandler(
    IAppDbContext db, IPhotoStore store, TimeProvider clock, ILogger<RemoveWrappedUpAlbumsCommandHandler> logger)
    : IRequestHandler<RemoveWrappedUpAlbumsCommand, int>
{
    /// <summary>How many Popkins are read at a time.</summary>
    public const int BatchSize = 100;

    public async Task<int> Handle(RemoveWrappedUpAlbumsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var wrappedUpBy = now - PopkinSpace.PhotosStayFor;
        var removed = 0;
        var failed = new List<Guid>();
        // Once stopping is asked, no new batch is begun; the one in hand is finished.
        while (!cancellationToken.IsCancellationRequested)
        {
            var due = await db.Popkins
                .Where(p => p.Status == PopkinStatus.WrappedUp && !p.KeepPhotos && p.PhotosRemovedAt == null && p.WrappedUpAt <= wrappedUpBy)
                .Where(p => !failed.Contains(p.Id))
                .OrderBy(p => p.WrappedUpAt)
                .Take(BatchSize)
                .ToListAsync(cancellationToken);
            if (due.Count == 0)
            {
                break;
            }

            foreach (var popkin in due)
            {
                try
                {
                    await RemoveAsync(popkin, now);
                    removed++;
                }
                catch (Exception exception)
                {
                    // Each Popkin is saved alone, so one that fails holds back no other; the next tick tries it again.
                    logger.LogError(exception, "The photos of the Popkin {PopkinId} could not be removed", popkin.Id);
                    failed.Add(popkin.Id);
                }
            }
        }

        return removed;
    }

    private async Task RemoveAsync(PopkinSpace popkin, DateTimeOffset now)
    {
        var photos = await db.Photos.Where(p => p.PopkinId == popkin.Id).ToListAsync(CancellationToken.None);
        var exports = await db.AlbumExports.Where(e => e.PopkinId == popkin.Id).ToListAsync(CancellationToken.None);
        try
        {
            // The files first: a file whose photo is gone could never be found again. Deleting a
            // file twice is harmless, so a tick that fails here is simply made again.
            foreach (var key in photos.SelectMany(p => new[] { p.StorageKey, p.ThumbnailKey }).Concat(exports.Select(e => e.StorageKey).OfType<string>()))
            {
                await store.DeleteAsync(key, CancellationToken.None);
            }

            db.Photos.RemoveRange(photos);
            db.AlbumExports.RemoveRange(exports);
            // The recap goes on counting what the album held; the photos of direct messages and unsent uploads go too.
            popkin.RemovePhotos(now, photos.Count(p => p.InAlbum));
            await db.SaveChangesAsync(CancellationToken.None);
        }
        catch
        {
            // Nothing of this Popkin is saved with the next one.
            photos.ForEach(photo => db.Photos.Entry(photo).State = EntityState.Detached);
            exports.ForEach(export => db.AlbumExports.Entry(export).State = EntityState.Detached);
            db.Popkins.Entry(popkin).State = EntityState.Detached;
            throw;
        }
    }
}
