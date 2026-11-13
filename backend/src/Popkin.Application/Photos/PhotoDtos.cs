using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Who added a photo: a first name and an avatar, never a contact detail (L2-054 AC2).</summary>
public sealed record PhotoUploaderDto(Guid MembershipId, string FirstName, AvatarDto Avatar);

/// <summary>
/// A photo as the album shows it: its thumbnail at an expiring address (L2-051 AC2), the size of
/// its display image, and whether the member reading it added it.
/// </summary>
public sealed record PhotoSummaryDto(
    Guid Id,
    string? Caption,
    PhotoUploaderDto Uploader,
    DateTimeOffset TakenAt,
    DateTimeOffset AddedAt,
    string ThumbnailUrl,
    int Width,
    int Height,
    bool IsMine)
{
    public static PhotoSummaryDto Of(Photo photo, Membership uploader, Guid viewerMembershipId, IPhotoStore store) =>
        new(
            photo.Id,
            photo.Caption,
            new PhotoUploaderDto(uploader.Id, PersonName.FirstName(uploader.DisplayName), AvatarDto.Of(uploader, store)),
            photo.TakenAt,
            photo.AddedAt,
            store.GetReadUrl(photo.ThumbnailKey),
            photo.Width,
            photo.Height,
            photo.UploaderMembershipId == viewerMembershipId);
}
