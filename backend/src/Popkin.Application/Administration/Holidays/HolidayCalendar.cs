using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Holidays;

public sealed record AdminHolidayDto(Guid Id, string Name, string? Note, DateOnly Date, HolidayStatus Status);

/// <summary>"Last edited": when, and the first name of the admin who did it ("14 Jan · Kwame").</summary>
public sealed record LastEditedDto(DateTimeOffset At, string AdminName);

/// <summary>A chosen calendar and year (L2-196 AC4); `Estimates` counts the year's estimated dates (L2-197 AC2).</summary>
public sealed record AdminHolidayCalendarDto(
    Guid Id,
    string Name,
    string HowSet,
    IReadOnlyList<int> Years,
    int Year,
    int People,
    int Popkins,
    LastEditedDto? LastEdited,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<AdminHolidayDto> Holidays,
    int Estimates);

/// <summary>Any admin reads a calendar and one of its years; with no year, the year chosen first (L2-196 AC4).</summary>
public sealed record GetAdminHolidayCalendarQuery(Guid CalendarId, int? Year) : IRequest<AdminHolidayCalendarDto>;

public sealed class GetAdminHolidayCalendarQueryHandler(IAppDbContext db, IAdminGuard guard, TimeProvider clock)
    : IRequestHandler<GetAdminHolidayCalendarQuery, AdminHolidayCalendarDto>
{
    public async Task<AdminHolidayCalendarDto> Handle(GetAdminHolidayCalendarQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        return await HolidayCalendarPanel.ReadAsync(db, request.CalendarId, request.Year, clock.GetUtcNow().Year, cancellationToken);
    }
}

/// <summary>The chosen calendar of the page, read for a query and after each change.</summary>
public static class HolidayCalendarPanel
{
    public static ProblemException NotFound() =>
        new(404, "holiday_calendar_not_found", "There is no such holiday calendar.");

    public static async Task<AdminHolidayCalendarDto> ReadAsync(IAppDbContext db, Guid calendarId, int? year, int thisYear, CancellationToken cancellationToken)
    {
        var calendar = await db.HolidayCalendars.AsNoTracking().FirstOrDefaultAsync(c => c.Id == calendarId, cancellationToken)
            ?? throw NotFound();
        var years = await db.HolidayCalendarYears.AsNoTracking().Where(y => y.CalendarId == calendarId).ToListAsync(cancellationToken);
        var published = years.Where(y => y.PublishedAt != null).Select(y => y.Year).ToArray();
        var tabs = HolidayCalendarRules.Years(thisYear);
        var chosen = year ?? HolidayCalendarRules.ChosenYear(published, thisYear);
        if (!tabs.Contains(chosen))
        {
            throw new ProblemException(400, "invalid_year", "Choose this year or one of the two after it.");
        }

        var holidays = await db.Holidays.AsNoTracking()
            .Where(h => h.CalendarId == calendarId && h.Year == chosen)
            .OrderBy(h => h.Date)
            .Select(h => new AdminHolidayDto(h.Id, h.Name, h.Note, h.Date, h.Status))
            .ToListAsync(cancellationToken);
        var use = await HolidayCalendarUse.ReadAsync(db, cancellationToken);
        return new AdminHolidayCalendarDto(
            calendar.Id,
            calendar.Name,
            calendar.HowSet,
            tabs,
            chosen,
            use.People(calendar.Id),
            use.Popkins(calendar.Id),
            await LastEditedAsync(db, calendarId, years, cancellationToken),
            years.FirstOrDefault(y => y.Year == chosen)?.PublishedAt,
            holidays,
            holidays.Count(h => h.Status == HolidayStatus.Estimated));
    }

    /// <summary>The latest change of a date or publish by an admin; the seed's own dates are no edit.</summary>
    private static async Task<LastEditedDto?> LastEditedAsync(
        IAppDbContext db, Guid calendarId, IEnumerable<HolidayCalendarYear> years, CancellationToken cancellationToken)
    {
        var changed = await db.Holidays.AsNoTracking()
            .Where(h => h.CalendarId == calendarId && h.ChangedByAdminId != null)
            .Select(h => new { At = h.ChangedAt!.Value, AdminId = h.ChangedByAdminId!.Value })
            .ToListAsync(cancellationToken);
        var latest = changed
            .Concat(years.Where(y => y.PublishedByAdminId != null).Select(y => new { At = y.PublishedAt!.Value, AdminId = y.PublishedByAdminId!.Value }))
            .OrderByDescending(e => e.At)
            .FirstOrDefault();
        if (latest is null)
        {
            return null;
        }

        var name = await db.Admins.AsNoTracking().Where(a => a.Id == latest.AdminId).Select(a => a.Name).FirstOrDefaultAsync(cancellationToken) ?? "";
        return new LastEditedDto(latest.At, name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "");
    }
}
