using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Administration.Holidays;
using Popkin.Domain;

namespace Popkin.Application.Administration;

/// <summary>
/// How much waits for an admin beside the sidebar's sections; HolidayCalendars counts the calendars
/// without next year's dates (L2-196 AC1).
/// </summary>
public sealed record AdminWaitingDto(int Reports, int FailedJobs, int FailedExports, int HolidayCalendars);

/// <summary>Any admin may read it. Reports and job runs join the count when their journeys add them.</summary>
public sealed record GetAdminWaitingQuery : IRequest<AdminWaitingDto>;

public sealed class GetAdminWaitingQueryHandler(IAppDbContext db, IAdminGuard guard, TimeProvider clock) : IRequestHandler<GetAdminWaitingQuery, AdminWaitingDto>
{
    public async Task<AdminWaitingDto> Handle(GetAdminWaitingQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var failedExports = await db.AlbumExports.CountAsync(e => e.Status == AlbumExportStatus.Failed, cancellationToken);
        var thisYear = clock.GetUtcNow().Year;
        var published = await HolidayCalendarUse.PublishedYearsAsync(db, cancellationToken);
        var holidayCalendars = published.Values.Count(years => HolidayCalendarRules.NeedsDates(years, thisYear));
        return new AdminWaitingDto(0, 0, failedExports, holidayCalendars);
    }
}
