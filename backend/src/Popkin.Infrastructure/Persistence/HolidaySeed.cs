using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence;

/// <summary>
/// The holiday calendars of `popkin seed`, with their dates for 2026 to 2028 (gap 145): until a
/// requirement names how a calendar is made, the seed is where they come from. Each calendar is
/// added once, by its key, with its years and holidays; one already there is left as it is.
/// </summary>
public static class HolidaySeed
{
    private sealed record SeedCalendar(string Key, string Name, string Holds, string HowSet, int[] Published, Func<int, IEnumerable<SeedHoliday>> Holidays, int[] Years);

    private sealed record SeedHoliday(string Name, DateOnly Date, HolidayStatus Status, string? Note = null);

    private static readonly int[] AllYears = [2026, 2027, 2028];

    private static readonly SeedCalendar[] Calendars =
    [
        new("us", "United States", "Federal and widely observed", "Fixed dates and rules", AllYears, UnitedStates, AllYears),
        new("uk", "United Kingdom", "Bank holidays, England & Wales", "Fixed dates and rules", AllYears, UnitedKingdom, AllYears),
        new("islamic", "Islamic holidays", "Ramadan, Eid al-Fitr, Eid al-Adha", "Moon sighting, confirmed by hand", [2026], Islamic, [2026, 2027]),
        new("hindu", "Hindu festivals", "Holi, Navratri, Diwali", "Lunar calendar, confirmed by hand", [2026], Hindu, [2026, 2027]),
        new("australia", "Australia", "National public holidays", "Fixed dates and rules", [], Australia, [2027]),
    ];

    public static async Task SeedAsync(AppDbContext db, DateTimeOffset now, CancellationToken cancellationToken)
    {
        for (var i = 0; i < Calendars.Length; i++)
        {
            var seed = Calendars[i];
            if (await db.HolidayCalendars.AnyAsync(c => c.Key == seed.Key, cancellationToken))
            {
                continue;
            }

            // A second apart, so the list keeps the seed's order (HolidayCalendar.CreatedAt).
            var calendar = HolidayCalendar.Create(seed.Key, seed.Name, seed.Holds, seed.HowSet, now.AddSeconds(i));
            db.HolidayCalendars.Add(calendar);
            foreach (var year in seed.Years)
            {
                var row = HolidayCalendarYear.Start(calendar.Id, year);
                if (seed.Published.Contains(year))
                {
                    row.Publish(null, now);
                }

                db.HolidayCalendarYears.Add(row);
                foreach (var holiday in seed.Holidays(year))
                {
                    db.Holidays.Add(Holiday.Add(calendar.Id, holiday.Name, holiday.Note, holiday.Date, holiday.Status));
                }
            }
        }
    }

    private static IEnumerable<SeedHoliday> UnitedStates(int year)
    {
        yield return Fixed("New Year’s Day", year, 1, 1);
        yield return new("Memorial Day", Last(year, 5, DayOfWeek.Monday), HolidayStatus.ByRule);
        yield return Fixed("Independence Day", year, 7, 4);
        yield return new("Labor Day", Nth(year, 9, DayOfWeek.Monday, 1), HolidayStatus.ByRule);
        yield return new("Thanksgiving", Nth(year, 11, DayOfWeek.Thursday, 4), HolidayStatus.ByRule);
        yield return Fixed("Christmas Day", year, 12, 25);
    }

    private static IEnumerable<SeedHoliday> UnitedKingdom(int year)
    {
        yield return Fixed("New Year’s Day", year, 1, 1);
        yield return new("Early May bank holiday", Nth(year, 5, DayOfWeek.Monday, 1), HolidayStatus.ByRule);
        yield return new("Spring bank holiday", Last(year, 5, DayOfWeek.Monday), HolidayStatus.ByRule);
        yield return new("Summer bank holiday", Last(year, 8, DayOfWeek.Monday), HolidayStatus.ByRule);
        yield return Fixed("Christmas Day", year, 12, 25);
        yield return Fixed("Boxing Day", year, 12, 26);
    }

    private static IEnumerable<SeedHoliday> Islamic(int year) => year == 2026
        ?
        [
            new("Ramadan begins", new DateOnly(2026, 2, 18), HolidayStatus.Confirmed),
            new("Eid al-Fitr", new DateOnly(2026, 3, 20), HolidayStatus.Confirmed),
            new("Eid al-Adha", new DateOnly(2026, 5, 27), HolidayStatus.Confirmed),
            new("Islamic New Year", new DateOnly(2026, 6, 16), HolidayStatus.Confirmed),
            new("Mawlid", new DateOnly(2026, 8, 25), HolidayStatus.Confirmed),
        ]
        :
        [
            new("Ramadan begins", new DateOnly(2027, 2, 8), HolidayStatus.Estimated, "Could be 9 Feb"),
            new("Eid al-Fitr", new DateOnly(2027, 3, 10), HolidayStatus.Estimated, "Could be 11 Mar"),
            new("Eid al-Adha", new DateOnly(2027, 5, 17), HolidayStatus.Estimated),
            new("Islamic New Year", new DateOnly(2027, 6, 6), HolidayStatus.Estimated),
            new("Mawlid", new DateOnly(2027, 8, 15), HolidayStatus.Estimated),
        ];

    private static IEnumerable<SeedHoliday> Hindu(int year) => year == 2026
        ?
        [
            new("Holi", new DateOnly(2026, 3, 4), HolidayStatus.Confirmed),
            new("Navratri begins", new DateOnly(2026, 10, 11), HolidayStatus.Confirmed),
            new("Diwali", new DateOnly(2026, 11, 8), HolidayStatus.Confirmed),
        ]
        :
        [
            new("Holi", new DateOnly(2027, 3, 22), HolidayStatus.Estimated),
            new("Navratri begins", new DateOnly(2027, 9, 30), HolidayStatus.Estimated),
            new("Diwali", new DateOnly(2027, 10, 29), HolidayStatus.Estimated, "Could be 30 Oct"),
        ];

    private static IEnumerable<SeedHoliday> Australia(int year)
    {
        yield return Fixed("New Year’s Day", year, 1, 1);
        yield return Fixed("Australia Day", year, 1, 26);
        yield return Fixed("Anzac Day", year, 4, 25);
        yield return Fixed("Christmas Day", year, 12, 25);
        yield return Fixed("Boxing Day", year, 12, 26);
    }

    /// <summary>A fixed date, with the weekday it is observed on when it falls at a weekend.</summary>
    private static SeedHoliday Fixed(string name, int year, int month, int day)
    {
        var date = new DateOnly(year, month, day);
        var observed = date.DayOfWeek switch
        {
            DayOfWeek.Saturday => date.AddDays(-1),
            DayOfWeek.Sunday => date.AddDays(1),
            _ => (DateOnly?)null,
        };
        var note = observed is { } on ? $"Observed {on.ToString("ddd d MMM", CultureInfo.InvariantCulture)}" : null;
        return new(name, date, HolidayStatus.ByRule, note);
    }

    private static DateOnly Nth(int year, int month, DayOfWeek day, int n)
    {
        var first = new DateOnly(year, month, 1);
        return first.AddDays(((int)day - (int)first.DayOfWeek + 7) % 7 + (7 * (n - 1)));
    }

    private static DateOnly Last(int year, int month, DayOfWeek day)
    {
        var last = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
        return last.AddDays(-(((int)last.DayOfWeek - (int)day + 7) % 7));
    }
}
