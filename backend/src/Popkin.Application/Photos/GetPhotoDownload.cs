using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>An address the photo downloads from as an attachment, and when it stops working (L2-036 AC1, L2-051 AC2).</summary>
public sealed record PhotoDownloadDto(string Url, DateTimeOffset ExpiresAt);

/// <summary>
/// "Save photo": the stored photo at the size it was added, its location and device data already
/// removed (L2-031 AC6), for anyone who may see it, in a wrapped-up Popkin too (L2-045 AC3).
/// </summary>
public sealed record GetPhotoDownloadQuery(Guid PopkinId, Guid PhotoId) : IRequest<PhotoDownloadDto>;

public sealed class GetPhotoDownloadQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store, TimeProvider clock)
    : IRequestHandler<GetPhotoDownloadQuery, PhotoDownloadDto>
{
    public async Task<PhotoDownloadDto> Handle(GetPhotoDownloadQuery request, CancellationToken cancellationToken)
    {
        var photo = (await PhotoAccess.RequireAsync(db, guard, request.PopkinId, request.PhotoId, cancellationToken)).Photo;
        var expiresAt = clock.GetUtcNow().Add(PhotoUrlSigner.Lifetime);
        // A photo stored before Popkin kept the size it was added is saved as its display image.
        return new PhotoDownloadDto(store.GetDownloadUrl(photo.OriginalKey ?? photo.StorageKey, FileNameOf(photo)), expiresAt);
    }

    /// <summary>
    /// `popkin-photo-{yyyyMMdd-HHmm}.{ext}`, from when it was taken (or added, when its file did
    /// not say), in UTC; every stored photo is a JPEG.
    /// </summary>
    public static string FileNameOf(Photo photo) => $"popkin-photo-{photo.TakenAt.UtcDateTime:yyyyMMdd-HHmm}.jpg";
}
