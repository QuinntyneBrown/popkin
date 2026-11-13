using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Security;

namespace Popkin.Application.Photos;

/// <summary>A photo as the Popkin home shows it: a thumbnail at an expiring address and its caption, if it has one.</summary>
public sealed record PhotoThumbnailDto(Guid Id, string ThumbnailUrl, string? Caption);

/// <summary>The Photos section of the Popkin home: how many photos there are and the latest few (L2-019 AC4).</summary>
public sealed record PhotosSummaryDto(int Count, IReadOnlyList<PhotoThumbnailDto> Photos);

/// <summary>The photos of a Popkin in brief, for any of its members (L2-019 AC4, L2-051 AC1).</summary>
public sealed record GetPhotosSummaryQuery(Guid PopkinId) : IRequest<PhotosSummaryDto>;

public sealed class GetPhotosSummaryQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetPhotosSummaryQuery, PhotosSummaryDto>
{
    /// <summary>The home shows the latest eight photos (L2-019 AC4).</summary>
    public const int Latest = 8;

    public async Task<PhotosSummaryDto> Handle(GetPhotosSummaryQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var album = db.Photos.AsNoTracking().Where(p => p.PopkinId == popkin.Id);
        var count = await album.CountAsync(cancellationToken);
        var latest = await album.LatestFirst().Take(Latest).ToListAsync(cancellationToken);

        return new PhotosSummaryDto(
            count, latest.Select(p => new PhotoThumbnailDto(p.Id, store.GetReadUrl(p.ThumbnailKey), p.Caption)).ToList());
    }
}
