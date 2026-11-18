using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Administration.Holidays;

/// <summary>
/// An Owner or Support sets a holiday's date, `yyyy-MM-dd`, which confirms it (L2-197 AC1, AC5).
/// No reason is asked (gap 145); the audit log keeps the change.
/// </summary>
public sealed record ChangeHolidayDateCommand(Guid CalendarId, Guid HolidayId, string? Date) : IRequest<AdminHolidayDto>;

public sealed class ChangeHolidayDateCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, TimeProvider clock)
    : IRequestHandler<ChangeHolidayDateCommand, AdminHolidayDto>
{
    public async Task<AdminHolidayDto> Handle(ChangeHolidayDateCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ChangeHolidayCalendars, cancellationToken);
        var holiday = await db.Holidays.FirstOrDefaultAsync(h => h.Id == request.HolidayId && h.CalendarId == request.CalendarId, cancellationToken)
            ?? throw new ProblemException(404, "holiday_not_found", "There is no such holiday.");
        var calendar = await db.HolidayCalendars.AsNoTracking().FirstAsync(c => c.Id == holiday.CalendarId, cancellationToken);
        if (!DateOnly.TryParseExact(request.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            throw InvalidDate(holiday.Year);
        }

        var old = holiday.Date;
        var oldStatus = holiday.Status;
        switch (holiday.Change(date, me.Id, clock.GetUtcNow()))
        {
            case HolidayChange.ByRule:
                throw new ProblemException(409, "holiday_by_rule", "This holiday follows a rule; its date does not change.");
            case HolidayChange.OutsideYear:
                throw InvalidDate(holiday.Year);
        }

        await audit.RecordAsync(
            new AuditRecord(
                AuditAction.ChangedHolidayDate,
                AuditTargetKind.HolidayCalendar,
                calendar.Id.ToString(),
                calendar.Name,
                null,
                new Dictionary<string, object?>
                {
                    ["year"] = holiday.Year,
                    ["holiday"] = holiday.Name,
                    ["old"] = old.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    ["new"] = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    ["oldStatus"] = oldStatus.ToString(),
                }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new AdminHolidayDto(holiday.Id, holiday.Name, holiday.Note, holiday.Date, holiday.Status);
    }

    private static ProblemException InvalidDate(int year) =>
        new(400, "invalid_date", $"Choose a date in {year}.", "date");
}

/// <summary>What a publish reached: "{calendar} {year} is live for {n} people and {m} Popkins." (L2-197 AC4).</summary>
public sealed record HolidayYearPublishedDto(string CalendarName, int Year, int People, int Popkins);

/// <summary>An Owner or Support publishes a year of a calendar, with a reason (L2-197 AC3, AC4).</summary>
public sealed record PublishHolidayYearCommand(Guid CalendarId, int Year, string? Reason) : IRequest<HolidayYearPublishedDto>;

public sealed class PublishHolidayYearCommandHandler(IAppDbContext db, IAdminGuard guard, IAuditLog audit, TimeProvider clock)
    : IRequestHandler<PublishHolidayYearCommand, HolidayYearPublishedDto>
{
    public async Task<HolidayYearPublishedDto> Handle(PublishHolidayYearCommand request, CancellationToken cancellationToken)
    {
        var me = await guard.RequireAsync(AdminAction.ChangeHolidayCalendars, cancellationToken);
        var reason = ReasonRules.Required(request.Reason);
        var calendar = await db.HolidayCalendars.AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.CalendarId, cancellationToken)
            ?? throw HolidayCalendarPanel.NotFound();
        var year = await db.HolidayCalendarYears.FirstOrDefaultAsync(y => y.CalendarId == calendar.Id && y.Year == request.Year, cancellationToken)
            ?? throw new ProblemException(404, "holiday_year_not_found", $"{calendar.Name} has no {request.Year} yet.");
        var statuses = await db.Holidays.AsNoTracking()
            .Where(h => h.CalendarId == calendar.Id && h.Year == request.Year)
            .Select(h => h.Status)
            .ToListAsync(cancellationToken);
        if (year.IsPublished)
        {
            throw new ProblemException(409, "holiday_year_published", $"{calendar.Name} {request.Year} is already live.");
        }

        if (statuses.Count == 0)
        {
            throw new ProblemException(409, "holiday_year_empty", $"{calendar.Name} has no {request.Year} dates to publish.");
        }

        year.Publish(me.Id, clock.GetUtcNow());
        var use = await HolidayCalendarUse.ReadAsync(db, cancellationToken);
        var people = use.People(calendar.Id);
        var popkins = use.Popkins(calendar.Id);
        await audit.RecordAsync(
            new AuditRecord(
                AuditAction.PublishedHolidayYear,
                AuditTargetKind.HolidayCalendar,
                calendar.Id.ToString(),
                calendar.Name,
                reason,
                new Dictionary<string, object?>
                {
                    ["year"] = request.Year,
                    ["dates"] = statuses.Count,
                    ["estimates"] = statuses.Count(s => s == HolidayStatus.Estimated),
                    ["people"] = people,
                    ["popkins"] = popkins,
                }),
            cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return new HolidayYearPublishedDto(calendar.Name, request.Year, people, popkins);
    }
}
