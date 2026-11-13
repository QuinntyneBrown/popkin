using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.WrapUp;

/// <summary>
/// An album export as a member follows it: how far it is and, once ready, the expiring address
/// its zip downloads from (L2-046 AC4, L2-051 AC2).
/// </summary>
public sealed record AlbumExportDto(Guid Id, AlbumExportStatus Status, int PhotosDone, int PhotosTotal, string? DownloadUrl)
{
    public static AlbumExportDto Of(AlbumExport export, PopkinSpace popkin, IPhotoStore store) =>
        new(
            export.Id,
            export.Status,
            export.PhotosDone,
            export.PhotosTotal,
            export is { Status: AlbumExportStatus.Ready, StorageKey: { } key } ? store.GetDownloadUrl(key, AlbumExportFiles.ZipName(popkin.Name)) : null);
}

public static class AlbumExportFiles
{
    private static readonly char[] NotInAFileName = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

    /// <summary>
    /// The name the zip downloads under: the Popkin's name, with a hyphen for each character no
    /// file name may hold.
    /// </summary>
    public static string ZipName(string popkinName)
    {
        var name = new string(popkinName.Select(c => char.IsControl(c) || NotInAFileName.Contains(c) ? '-' : c).ToArray()).Trim(' ', '.');
        return $"{(name.Length == 0 ? "Popkin" : name)}.zip";
    }

    public static ProblemException NotFound() => new(404, "export_not_found", "This export isn't here.");
}

/// <summary>
/// A member asks to save the album of a wrapped-up Popkin (L2-046 AC4). An export that is being
/// prepared, or is ready and has not expired, answers again; otherwise a new one starts, which
/// the Worker prepares.
/// </summary>
public sealed record StartAlbumExportCommand(Guid PopkinId) : IRequest<AlbumExportDto>;

public sealed class StartAlbumExportCommandHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store)
    : IRequestHandler<StartAlbumExportCommand, AlbumExportDto>
{
    public async Task<AlbumExportDto> Handle(StartAlbumExportCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireWrappedUpMemberAsync(request.PopkinId, cancellationToken);
        if (popkin.PhotosRemovedAt is not null)
        {
            throw new ProblemException(409, "album_removed", "The photos of this Popkin were removed.");
        }

        var now = clock.GetUtcNow();
        var exports = await db.AlbumExports.AsNoTracking()
            .Where(e => e.PopkinId == popkin.Id && e.Status != AlbumExportStatus.Failed)
            .ToListAsync(cancellationToken);
        var export = exports.Where(e => e.CanBeUsedAt(now)).OrderByDescending(e => e.RequestedAt).FirstOrDefault();
        if (export is null)
        {
            var photos = await db.Photos.CountAsync(p => p.PopkinId == popkin.Id, cancellationToken);
            export = AlbumExport.Request(popkin.Id, membership.Id, photos, now);
            db.AlbumExports.Add(export);
            await db.SaveChangesAsync(cancellationToken);
        }

        return AlbumExportDto.Of(export, popkin, store);
    }
}

/// <summary>How far an album export is, for any member of its Popkin (L2-046 AC4, L2-051 AC1).</summary>
public sealed record GetAlbumExportQuery(Guid PopkinId, Guid ExportId) : IRequest<AlbumExportDto>;

public sealed class GetAlbumExportQueryHandler(IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore store)
    : IRequestHandler<GetAlbumExportQuery, AlbumExportDto>
{
    public async Task<AlbumExportDto> Handle(GetAlbumExportQuery request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var export = await db.AlbumExports.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.ExportId && e.PopkinId == popkin.Id, cancellationToken);
        // An export that has expired is gone, as its zip soon is.
        return export is null || export.HasExpiredAt(clock.GetUtcNow()) ? throw AlbumExportFiles.NotFound() : AlbumExportDto.Of(export, popkin, store);
    }
}
