using Microsoft.Extensions.DependencyInjection;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Support;

/// <summary>A holiday of an arranged calendar: its year is its date's.</summary>
public sealed record ArrangedHoliday(string Name, DateOnly Date, HolidayStatus Status, string? Note = null);

public static class HolidayExtensions
{
    /// <summary>
    /// Adds a calendar straight to the store, as `popkin seed` does, with the years it published
    /// and its holidays; a year with holidays and not published is a draft year of it.
    /// </summary>
    public static async Task<Guid> AddHolidayCalendarAsync(
        this ApiFactory api, string name, string holds, string howSet, int[] published, params ArrangedHoliday[] holidays)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var calendar = HolidayCalendar.Create(name.ToLowerInvariant().Replace(' ', '-'), name, holds, howSet, api.Clock.GetUtcNow());
        db.HolidayCalendars.Add(calendar);
        foreach (var year in published.Concat(holidays.Select(h => h.Date.Year)).Distinct())
        {
            var row = HolidayCalendarYear.Start(calendar.Id, year);
            if (published.Contains(year))
            {
                row.Publish(null, api.Clock.GetUtcNow());
            }

            db.HolidayCalendarYears.Add(row);
        }

        foreach (var holiday in holidays)
        {
            db.Holidays.Add(Holiday.Add(calendar.Id, holiday.Name, holiday.Note, holiday.Date, holiday.Status));
        }

        await db.SaveChangesAsync();
        return calendar.Id;
    }

    /// <summary>Adds a year with no holidays to a calendar, not published.</summary>
    public static async Task AddHolidayYearAsync(this ApiFactory api, Guid calendarId, int year)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.HolidayCalendarYears.Add(HolidayCalendarYear.Start(calendarId, year));
        await db.SaveChangesAsync();
    }

    /// <summary>The Popkin observes the calendar, set straight in the store.</summary>
    public static async Task ObserveHolidaysAsync(this ApiFactory api, Guid popkinId, Guid? calendarId)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Popkins.Single(p => p.Id == popkinId).ObserveHolidays(calendarId);
        await db.SaveChangesAsync();
    }
}
