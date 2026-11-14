using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Photos;

/// <summary>Whose photos a page of the album lists (L2-032 AC3).</summary>
public enum AlbumFilter
{
    Everyone,
    Mine,
}

/// <summary>Someone who added to the album: a first name and an avatar only (L2-054 AC2).</summary>
public sealed record AlbumContributorDto(string FirstName, AvatarDto Avatar);

/// <summary>
/// A page of the album. The counts and the contributors describe the whole album whatever the
/// filter; `Items` follow the filter, latest taken first; `NextCursor` reads the page after
/// this one and is null on the last; `CanAdd` is false once the Popkin has wrapped up.
/// </summary>
public sealed record AlbumPageDto(
    int PhotoCount,
    int ContributorCount,
    IReadOnlyList<AlbumContributorDto> Contributors,
    IReadOnlyList<PhotoSummaryDto> Items,
    string? NextCursor,
    bool CanAdd);

/// <summary>A page of a Popkin's album, for any of its members (L2-032, L2-051 AC1).</summary>
public sealed record GetAlbumQuery(Guid PopkinId, string? Filter = null, string? Cursor = null, int? Limit = null) : IRequest<AlbumPageDto>;

public sealed class GetAlbumQueryHandler(IAppDbContext db, IMembershipGuard guard, IPhotoStore store)
    : IRequestHandler<GetAlbumQuery, AlbumPageDto>
{
    /// <summary>A page holds at most 60 photos (L2-032 AC6).</summary>
    public const int PageSize = 60;

    /// <summary>The album names its latest contributors by avatar; the rest are counted.</summary>
    public const int MaxContributors = 4;

    public async Task<AlbumPageDto> Handle(GetAlbumQuery request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var filter = ParseFilter(request.Filter);
        var after = ParseCursor(request.Cursor);
        var limit = request.Limit is > 0 and <= PageSize ? request.Limit.Value : PageSize;

        var album = db.Photos.AsNoTracking().InAlbumOf(popkin.Id);
        var photoCount = await album.CountAsync(cancellationToken);
        // Who added, by their latest photo: the most recent contributors come first.
        var contributors = await album
            .GroupBy(p => p.UploaderMembershipId)
            .Select(g => new { MembershipId = g.Key, LastAddedAt = g.Max(p => p.AddedAt) })
            .OrderByDescending(c => c.LastAddedAt)
            .ThenByDescending(c => c.MembershipId)
            .ToListAsync(cancellationToken);

        var listed = filter == AlbumFilter.Mine ? album.Where(p => p.UploaderMembershipId == membership.Id) : album;
        if (after is { } point)
        {
            listed = listed.OlderThan(point);
        }

        // One more than the page says whether another follows, without a second read.
        var read = await listed.LatestFirst().Take(limit + 1).ToListAsync(cancellationToken);
        var page = read.Take(limit).ToList();

        // A member who has left still added their photos, so uploaders are read whether or not they are still in.
        var shown = contributors.Take(MaxContributors).Select(c => c.MembershipId).ToList();
        var memberIds = page.Select(p => p.UploaderMembershipId).Concat(shown).Distinct().ToList();
        var members = await db.Memberships.AsNoTracking().Where(m => memberIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);

        return new AlbumPageDto(
            photoCount,
            contributors.Count,
            shown.Select(id => new AlbumContributorDto(PersonName.FirstName(members[id].DisplayName), AvatarDto.Of(members[id], store))).ToList(),
            page.Select(p => PhotoSummaryDto.Of(p, members[p.UploaderMembershipId], membership.Id, store)).ToList(),
            read.Count > limit ? PhotoPoint.Of(page[^1]).ToCursor() : null,
            CanAdd: popkin.Status == PopkinStatus.Active);
    }

    private static AlbumFilter ParseFilter(string? filter)
    {
        if (string.IsNullOrEmpty(filter))
        {
            return AlbumFilter.Everyone;
        }

        // A number is not a filter, though it would parse as the enum's value.
        return Enum.TryParse<AlbumFilter>(filter, ignoreCase: true, out var parsed) && Enum.IsDefined(parsed) && !char.IsAsciiDigit(filter[0])
            ? parsed
            : throw ProblemException.Invalid("invalid_filter", "The filter is everyone or mine.", "filter");
    }

    private static PhotoPoint? ParseCursor(string? cursor)
    {
        if (string.IsNullOrEmpty(cursor))
        {
            return null;
        }

        return PhotoPoint.FromCursor(cursor) ?? throw ProblemException.Invalid("invalid_cursor", "That place in the album isn't known.", "cursor");
    }
}
