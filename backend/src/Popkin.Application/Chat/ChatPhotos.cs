using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
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

    /// <summary>The photo of one message: null when it carries none.</summary>
    public static async Task<ChatPhotoDto?> OfAsync(IAppDbContext db, IPhotoStore store, Message message, CancellationToken cancellationToken) =>
        (await OfAsync(db, store, [message], cancellationToken)).GetValueOrDefault(message.Id);
}
