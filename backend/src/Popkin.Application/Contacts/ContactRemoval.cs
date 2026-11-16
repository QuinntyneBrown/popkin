using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Contacts;

/// <summary>
/// Every Contacts row kept about a contact, removed together: by Delete a contact (L2-132) and by
/// the erasure of a deleted account (L2-049 AC4), so both remove the same rows and files. Each
/// Contacts table that names a contact is listed here. Nothing is saved; the caller saves once,
/// then deletes the stored files the removal answers with.
/// </summary>
public static class ContactRemoval
{
    /// <summary>Removes the contacts and their rows; answers the keys of their stored files.</summary>
    public static async Task<IReadOnlyList<string>> RemoveAsync(
        IAppDbContext db, IQueryable<Contact> contacts, CancellationToken cancellationToken)
    {
        var removed = await contacts.ToListAsync(cancellationToken);
        var files = removed.Select(c => c.PhotoKey).OfType<string>().ToList();
        var ids = removed.Select(c => c.Id).ToList();
        db.KeyDates.RemoveRange(await db.KeyDates.Where(d => ids.Contains(d.ContactId)).ToListAsync(cancellationToken));
        db.FollowUps.RemoveRange(await db.FollowUps.Where(f => f.ContactId != null && ids.Contains(f.ContactId.Value)).ToListAsync(cancellationToken));
        db.Contacts.RemoveRange(removed);
        return files;
    }

    /// <summary>
    /// Deletes stored files once the rows are gone. A file the store cannot delete stays and is
    /// logged by its count only, never its key (known gap 110, ruled: no sweep).
    /// </summary>
    public static async Task DeleteFilesAsync(IPhotoStore photos, IReadOnlyList<string> files, ILogger logger)
    {
        var failed = 0;
        foreach (var key in files)
        {
            try
            {
                await photos.DeleteAsync(key, CancellationToken.None);
            }
            catch (Exception exception)
            {
                failed++;
                logger.LogWarning(exception, "A file of a removed contact could not be deleted");
            }
        }

        if (failed > 0)
        {
            logger.LogWarning("{Count} files of removed contacts stay in the photo store", failed);
        }
    }
}
