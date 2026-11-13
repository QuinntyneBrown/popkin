using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// What the recap counts (L2-046 AC2), counted the same way where the wrap-up screen says what
/// the recap will hold (L2-043 AC1). The database counts; no row is read.
/// </summary>
public static class RecapCounts
{
    /// <summary>
    /// The messages members wrote in the Everyone thread and did not delete. The notes Popkin
    /// writes itself, such as "popped in", are not messages sent.
    /// </summary>
    public static Task<int> MessagesAsync(IAppDbContext db, Guid popkinId, CancellationToken cancellationToken) =>
        db.Messages.AsNoTracking().CountAsync(
            m => m.Kind == MessageKind.Member
                && m.DeletedAt == null
                && db.ChatThreads.Any(t => t.Id == m.ThreadId && t.PopkinId == popkinId && t.Kind == ChatThreadKind.Everyone),
            cancellationToken);

    /// <summary>
    /// The photos of the album; once the album was removed (L2-045 AC4), the number it held
    /// then, because they were shared all the same.
    /// </summary>
    public static async Task<int> PhotosAsync(IAppDbContext db, PopkinSpace popkin, CancellationToken cancellationToken) =>
        popkin.PhotosRemovedCount ?? await db.Photos.AsNoTracking().CountAsync(p => p.PopkinId == popkin.Id, cancellationToken);
}
