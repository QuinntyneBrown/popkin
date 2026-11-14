using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>A photo a member may see, with the Popkin and the membership that let them.</summary>
public sealed record PhotoInReach(PopkinSpace Popkin, Membership Membership, Photo Photo);

/// <summary>
/// The one read guard of a photo, for the photo view and for everything done to a photo
/// (L2-033 to L2-036, L2-051): any member sees a photo of the album; a photo of chat outside the
/// album only someone who may read its message does: a direct message's its two members (L2-023
/// AC2). Anything else is 404 `photo_not_found`, as for no photo.
/// </summary>
public static class PhotoAccess
{
    public static ProblemException NotFound() => new(404, "photo_not_found", "This photo isn't here.");

    public static async Task<PhotoInReach> RequireAsync(
        IAppDbContext db, IMembershipGuard guard, Guid popkinId, Guid photoId, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(popkinId, cancellationToken);
        // A photo of another Popkin is the same as no photo (L2-051 AC3).
        var photo = await db.Photos.FirstOrDefaultAsync(p => p.Id == photoId && p.PopkinId == popkin.Id, cancellationToken)
            ?? throw NotFound();

        // A photo of chat outside the album is the same as no photo to anyone who may not read
        // its message: a direct message's to a third member, an upload never sent to everyone.
        if (!photo.InAlbum && !await IsOnAMessageTheMemberReadsAsync(db, photo, membership, cancellationToken))
        {
            throw NotFound();
        }

        return new PhotoInReach(popkin, membership, photo);
    }

    /// <summary>The Popkin's state, past the read guard: nothing changes in a wrapped-up Popkin (L2-045 AC2).</summary>
    public static void RequireActive(PhotoInReach target)
    {
        if (target.Popkin.Status == PopkinStatus.WrappedUp)
        {
            throw MembershipGuard.WrappedUp();
        }
    }

    private static async Task<bool> IsOnAMessageTheMemberReadsAsync(IAppDbContext db, Photo photo, Membership membership, CancellationToken cancellationToken)
    {
        if (photo.ThreadId is not { } threadId
            || !await db.Messages.AnyAsync(m => m.PhotoId == photo.Id && m.ThreadId == threadId && m.DeletedAt == null, cancellationToken))
        {
            return false;
        }

        var thread = await db.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == threadId && t.PopkinId == photo.PopkinId, cancellationToken);
        return thread is not null && thread.CanRead(membership.Id);
    }
}
