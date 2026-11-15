using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>How much waits for an admin beside the sidebar's Reports, Jobs and Album exports.</summary>
public sealed record AdminWaitingDto(int Reports, int FailedJobs, int FailedExports);

/// <summary>Any admin may read it. Reports and job runs join the count when their journeys add them.</summary>
public sealed record GetAdminWaitingQuery : IRequest<AdminWaitingDto>;

public sealed class GetAdminWaitingQueryHandler(IAppDbContext db, IAdminGuard guard) : IRequestHandler<GetAdminWaitingQuery, AdminWaitingDto>
{
    public async Task<AdminWaitingDto> Handle(GetAdminWaitingQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var failedExports = await db.AlbumExports.CountAsync(e => e.Status == AlbumExportStatus.Failed, cancellationToken);
        return new AdminWaitingDto(0, 0, failedExports);
    }
}
