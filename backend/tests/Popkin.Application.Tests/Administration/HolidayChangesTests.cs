using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>Changing a holiday's date and publishing a year, one case per row (L2-197).</summary>
public sealed class HolidayChangesTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);
    private static readonly Guid Admin = Guid.NewGuid();

    [Fact]
    public void An_estimate_changed_is_confirmed_on_its_new_date()
    {
        var holiday = Holiday.Add(Guid.NewGuid(), "Ramadan begins", "Could be 19 Feb", new DateOnly(2027, 2, 8), HolidayStatus.Estimated);

        Assert.Equal(HolidayChange.Changed, holiday.Change(new DateOnly(2027, 2, 9), Admin, Now));
        Assert.Equal(new DateOnly(2027, 2, 9), holiday.Date);
        Assert.Equal(HolidayStatus.Confirmed, holiday.Status);
        Assert.Equal(Now, holiday.ChangedAt);
        Assert.Equal(Admin, holiday.ChangedByAdminId);
    }

    [Fact]
    public void A_confirmed_date_can_change_again()
    {
        var holiday = Holiday.Add(Guid.NewGuid(), "Eid", null, new DateOnly(2027, 3, 10), HolidayStatus.Confirmed);

        Assert.Equal(HolidayChange.Changed, holiday.Change(new DateOnly(2027, 3, 11), Admin, Now));
        Assert.Equal(HolidayStatus.Confirmed, holiday.Status);
    }

    [Fact]
    public void A_holiday_by_rule_does_not_change()
    {
        var holiday = Holiday.Add(Guid.NewGuid(), "New Year", null, new DateOnly(2027, 1, 1), HolidayStatus.ByRule);

        Assert.Equal(HolidayChange.ByRule, holiday.Change(new DateOnly(2027, 1, 2), Admin, Now));
        Assert.Equal(new DateOnly(2027, 1, 1), holiday.Date);
    }

    [Fact]
    public void A_date_outside_its_year_does_not_change_it()
    {
        var holiday = Holiday.Add(Guid.NewGuid(), "Mawlid", null, new DateOnly(2027, 8, 15), HolidayStatus.Estimated);

        Assert.Equal(HolidayChange.OutsideYear, holiday.Change(new DateOnly(2028, 8, 15), Admin, Now));
        Assert.Equal(HolidayStatus.Estimated, holiday.Status);
    }

    [Fact]
    public void A_year_is_published_once()
    {
        var year = HolidayCalendarYear.Start(Guid.NewGuid(), 2027);

        Assert.True(year.Publish(Admin, Now));
        Assert.False(year.Publish(Guid.NewGuid(), Now.AddHours(1)));
        Assert.Equal(Now, year.PublishedAt);
        Assert.Equal(Admin, year.PublishedByAdminId);
    }
}
