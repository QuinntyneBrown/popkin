using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Photos;
using Popkin.Domain;

namespace Popkin.Application.Chat;

public static class ChatPhotos
{
    /// <summary>
    /// The photo of each message given that carries one and is still there, by the message's id.
    /// A deleted message shows no photo, and neither does one whose photo was removed.
    /// </summary>
    public static async Task<Dictionary<Guid, ChatPhotoDto>> OfAsync(
        IAppDbContext db, IPhotoStore store, IReadOnlyCollection<Message> messages, CancellationToken cancellationToken)
    {
        var shown = messages.Where(m => m.PhotoId is not null && m.DeletedAt is null).ToList();
        if (shown.Count == 0)
        {
            return [];
        }

        var photoIds = shown.Select(m => m.PhotoId!.Value).ToList();
        var photos = await db.Photos.AsNoTracking().Where(p => photoIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, cancellationToken);
        return shown
            .Where(m => photos.ContainsKey(m.PhotoId!.Value))
            .ToDictionary(m => m.Id, m => ChatPhotoDto.Of(photos[m.PhotoId!.Value], store));
    }

    /// <summary>
    /// The photo a message being deleted leaves behind, marked for removal with the next save:
    /// one in the album stays there, added under its sender; one of a direct message goes with
    /// its message (L2-026). Null when nothing goes.
    /// </summary>
    public static async Task<Photo?> RemoveWithAsync(IAppDbContext db, Message message, CancellationToken cancellationToken)
    {
        var photo = message.PhotoId is { } photoId
            ? await db.Photos.FirstOrDefaultAsync(p => p.Id == photoId && !p.InAlbum, cancellationToken)
            : null;
        if (photo is not null)
        {
            db.Photos.Remove(photo);
        }

        return photo;
    }

    /// <summary>The files of a removed photo, after the commit: a file left behind is harmless, a photo without its files is not.</summary>
    public static async Task DeleteFilesAsync(IPhotoStore store, Photo? removed)
    {
        if (removed is not null)
        {
            await PhotoFiles.DeleteAsync(store, removed.StorageKey, removed.ThumbnailKey);
        }
    }

    /// <summary>The photo of one message: null when it carries none.</summary>
    public static async Task<ChatPhotoDto?> OfAsync(IAppDbContext db, IPhotoStore store, Message message, CancellationToken cancellationToken) =>
        (await OfAsync(db, store, [message], cancellationToken)).GetValueOrDefault(message.Id);
}
