using MediatR;
using Popkin.Application.Security;

namespace Popkin.Application.Photos;

/// <summary>A photo as the Popkin home shows it: a thumbnail at an expiring address and its caption, if it has one.</summary>
public sealed record PhotoThumbnailDto(Guid Id, string ThumbnailUrl, string? Caption);

/// <summary>The Photos section of the Popkin home: how many photos there are and the latest few (L2-019 AC4).</summary>
public sealed record PhotosSummaryDto(int Count, IReadOnlyList<PhotoThumbnailDto> Photos);

/// <summary>The photos of a Popkin in brief, for any of its members (L2-019 AC4, L2-051 AC1).</summary>
public sealed record GetPhotosSummaryQuery(Guid PopkinId) : IRequest<PhotosSummaryDto>;

public sealed class GetPhotosSummaryQueryHandler(IMembershipGuard guard) : IRequestHandler<GetPhotosSummaryQuery, PhotosSummaryDto>
{
    public async Task<PhotosSummaryDto> Handle(GetPhotosSummaryQuery request, CancellationToken cancellationToken)
    {
        await guard.RequireMemberAsync(request.PopkinId, cancellationToken);

        // A Popkin has no photos until the album is built (journey 5), so the section is empty.
        return new PhotosSummaryDto(0, []);
    }
}
