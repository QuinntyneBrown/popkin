using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Administration.Holidays;

/// <summary>A row of the list of calendars (L2-196 AC2).</summary>
public sealed record AdminHolidayCalendarRowDto(Guid Id, string Name, string Holds, int People, int? DatesThrough, bool Draft, bool NeedsDates);

/// <summary>The calendars with no dates after this year, and the distinct people using any of them (L2-196 AC3).</summary>
public sealed record WithoutNextYearDto(IReadOnlyList<string> Names, int People);

public sealed record AdminHolidayCalendarsDto(int ThisYear, IReadOnlyList<AdminHolidayCalendarRowDto> Calendars, WithoutNextYearDto WithoutNextYear);

/// <summary>Any admin reads Holiday calendars (L2-196 AC2, AC3).</summary>
public sealed record GetAdminHolidayCalendarsQuery : IRequest<AdminHolidayCalendarsDto>;

public sealed class GetAdminHolidayCalendarsQueryHandler(IAppDbContext db, IAdminGuard guard, TimeProvider clock)
    : IRequestHandler<GetAdminHolidayCalendarsQuery, AdminHolidayCalendarsDto>
{
    public async Task<AdminHolidayCalendarsDto> Handle(GetAdminHolidayCalendarsQuery request, CancellationToken cancellationToken)
    {
        await guard.CurrentAdminAsync(cancellationToken);
        var thisYear = clock.GetUtcNow().Year;
        var calendars = await db.HolidayCalendars.AsNoTracking().OrderBy(c => c.CreatedAt).ToListAsync(cancellationToken);
        var published = await HolidayCalendarUse.PublishedYearsAsync(db, cancellationToken);
        var use = await HolidayCalendarUse.ReadAsync(db, cancellationToken);
        var rows = calendars.Select(c =>
        {
            var years = published.GetValueOrDefault(c.Id, []);
            return new AdminHolidayCalendarRowDto(
                c.Id,
                c.Name,
                c.Holds,
                use.People(c.Id),
                HolidayCalendarRules.DatesThrough(years),
                HolidayCalendarRules.IsDraft(years),
                HolidayCalendarRules.NeedsDates(years, thisYear));
        }).ToList();
        var warned = rows.Where(r => r.NeedsDates).ToList();
        return new AdminHolidayCalendarsDto(
            thisYear,
            rows,
            new WithoutNextYearDto(warned.Select(r => r.Name).ToList(), use.People(warned.Select(r => r.Id))));
    }
}

/// <summary>
/// Who uses each calendar: the distinct members of the active Popkins observing it (gap 144), and
/// those Popkins, read in one pass over Popkins and Memberships.
/// </summary>
public sealed class HolidayCalendarUse
{
    private readonly ILookup<Guid, Guid> _people;
    private readonly ILookup<Guid, Guid> _popkins;

    private HolidayCalendarUse(ILookup<Guid, Guid> people, ILookup<Guid, Guid> popkins)
    {
        _people = people;
        _popkins = popkins;
    }

    public int People(Guid calendarId) => _people[calendarId].Distinct().Count();

    public int People(IEnumerable<Guid> calendarIds) => calendarIds.SelectMany(id => _people[id]).Distinct().Count();

    public int Popkins(Guid calendarId) => _popkins[calendarId].Count();

    public static async Task<HolidayCalendarUse> ReadAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        var popkins = await db.Popkins.AsNoTracking()
            .Where(p => p.Status == PopkinStatus.Active && p.HolidayCalendarId != null)
            .Select(p => new { p.Id, CalendarId = p.HolidayCalendarId!.Value })
            .ToListAsync(cancellationToken);
        var ids = popkins.Select(p => p.Id).ToList();
        var members = await db.Memberships.AsNoTracking()
            .Where(m => m.LeftAt == null && ids.Contains(m.PopkinId))
            .Select(m => new { m.PopkinId, m.PersonId })
            .ToListAsync(cancellationToken);
        var calendarOf = popkins.ToDictionary(p => p.Id, p => p.CalendarId);
        return new HolidayCalendarUse(
            members.ToLookup(m => calendarOf[m.PopkinId], m => m.PersonId),
            popkins.ToLookup(p => p.CalendarId, p => p.Id));
    }

    /// <summary>The years each calendar has published.</summary>
    public static async Task<Dictionary<Guid, int[]>> PublishedYearsAsync(IAppDbContext db, CancellationToken cancellationToken) =>
        (await db.HolidayCalendarYears.AsNoTracking()
            .Where(y => y.PublishedAt != null)
            .Select(y => new { y.CalendarId, y.Year })
            .ToListAsync(cancellationToken))
        .GroupBy(y => y.CalendarId)
        .ToDictionary(g => g.Key, g => g.Select(y => y.Year).ToArray());
}
