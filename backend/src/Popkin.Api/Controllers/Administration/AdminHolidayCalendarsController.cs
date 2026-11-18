using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration.Holidays;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Holiday calendars: their dates and who uses them (L2-196, L2-197).</summary>
[Route("api/admin/holiday-calendars")]
public sealed class AdminHolidayCalendarsController(ISender sender) : AdminControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminHolidayCalendarsDto>> GetCalendars(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminHolidayCalendarsQuery(), cancellationToken));

    [HttpGet("{calendarId:guid}")]
    public async Task<ActionResult<AdminHolidayCalendarDto>> GetCalendar(Guid calendarId, [FromQuery] int? year, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminHolidayCalendarQuery(calendarId, year), cancellationToken));

    public sealed record ChangeDateRequest(string? Date);

    [HttpPut("{calendarId:guid}/holidays/{holidayId:guid}")]
    public async Task<ActionResult<AdminHolidayDto>> ChangeDate(Guid calendarId, Guid holidayId, ChangeDateRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ChangeHolidayDateCommand(calendarId, holidayId, request.Date), cancellationToken));

    public sealed record PublishRequest(string? Reason);

    [HttpPost("{calendarId:guid}/years/{year:int}/publish")]
    public async Task<ActionResult<HolidayYearPublishedDto>> Publish(Guid calendarId, int year, PublishRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new PublishHolidayYearCommand(calendarId, year, request.Reason), cancellationToken));
}
