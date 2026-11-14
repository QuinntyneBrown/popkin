using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Who added a photo, as the photo view names them: no contact detail (L2-054 AC2).</summary>
public sealed record PhotoDetailUploaderDto(Guid MembershipId, string FirstName, string DisplayName, AvatarDto Avatar);

/// <summary>One reaction to a photo: how many members gave it and whether the reader did (journey 14).</summary>
public sealed record PhotoReactionDto(string Emoji, int Count, bool Mine);

/// <summary>
/// A photo as the photo view shows it: the display image at an expiring address (L2-051 AC2)
/// with its size, so the screen keeps its place while it loads (L2-055 AC5), and its
/// neighbours in the album: `PreviousPhotoId` is the newer one and `NextPhotoId` the older one.
/// </summary>
public sealed record PhotoDetailDto(
    Guid Id,
    PhotoDetailUploaderDto Uploader,
    DateTimeOffset AddedAt,
    DateTimeOffset TakenAt,
    string? Caption,
    string ImageUrl,
    int Width,
    int Height,
    IReadOnlyList<PhotoReactionDto> Reactions,
    int CommentCount,
    Guid? PreviousPhotoId,
    Guid? NextPhotoId,
    bool CanDelete,
    bool IsMine);

/// <summary>
/// One photo of a Popkin, for any of its members when it is in the album (L2-033, L2-051 AC1);
/// a photo of a direct message only for its two members, once sent (L2-023 AC2, L2-026).
/// </summary>
public sealed record GetPhotoQuery(Guid PopkinId, Guid PhotoId) : IRequest<PhotoDetailDto>;

public sealed class GetPhotoQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetPhotoQuery, PhotoDetailDto>
{
    public async Task<PhotoDetailDto> Handle(GetPhotoQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership, photo) = await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken);

        // The neighbours follow the whole album, whatever filter the member came from; a photo in no album has none.
        Guid? newer = null, older = null;
        if (photo.InAlbum)
        {
            var album = db.Photos.AsNoTracking().InAlbumOf(popkin.Id);
            var point = PhotoPoint.Of(photo);
            newer = await album.NewerThan(point).OldestFirst().Select(p => (Guid?)p.Id).FirstOrDefaultAsync(cancellationToken);
            older = await album.OlderThan(point).LatestFirst().Select(p => (Guid?)p.Id).FirstOrDefaultAsync(cancellationToken);
        }

        // A member who has left still added their photos.
        var uploader = await db.Memberships.AsNoTracking().FirstAsync(m => m.Id == photo.UploaderMembershipId, cancellationToken);
        var isMine = uploader.Id == membership.Id;

        return new PhotoDetailDto(
            photo.Id,
            new PhotoDetailUploaderDto(uploader.Id, PersonName.FirstName(uploader.DisplayName), uploader.DisplayName, AvatarDto.Of(uploader, store)),
            photo.AddedAt,
            photo.TakenAt,
            photo.Caption,
            store.GetReadUrl(photo.StorageKey),
            photo.Width,
            photo.Height,
            await PhotoReactions.OfAsync(db, photo.Id, membership.Id, cancellationToken),
            CommentCount: 0,
            newer,
            older,
            // The Host looks after the album; a photo of a direct message is its sharer's alone.
            CanDelete: isMine || (photo.InAlbum && membership.Role == MembershipRole.Host),
            isMine);
    }
}
