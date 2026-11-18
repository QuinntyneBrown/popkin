using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>A calendar's "Dates through", its warning and the year chosen first, one case per row (L2-196).</summary>
public sealed class HolidayCalendarRulesTests
{
    private const int ThisYear = 2026;

    [Fact]
    public void A_calendar_with_no_published_year_is_a_draft_and_not_warned()
    {
        Assert.True(HolidayCalendarRules.IsDraft([]));
        Assert.Null(HolidayCalendarRules.DatesThrough([]));
        Assert.False(HolidayCalendarRules.NeedsDates([], ThisYear));
    }

    [Fact]
    public void A_calendar_published_through_this_year_needs_dates()
    {
        Assert.Equal(ThisYear, HolidayCalendarRules.DatesThrough([ThisYear - 1, ThisYear]));
        Assert.True(HolidayCalendarRules.NeedsDates([ThisYear - 1, ThisYear], ThisYear));
    }

    [Fact]
    public void A_calendar_published_through_last_year_needs_dates() =>
        Assert.True(HolidayCalendarRules.NeedsDates([ThisYear - 1], ThisYear));

    [Fact]
    public void A_calendar_published_through_next_year_does_not() =>
        Assert.False(HolidayCalendarRules.NeedsDates([ThisYear, ThisYear + 1], ThisYear));

    [Fact]
    public void The_years_are_this_year_and_the_two_after_it() =>
        Assert.Equal([ThisYear, ThisYear + 1, ThisYear + 2], HolidayCalendarRules.Years(ThisYear));

    [Fact]
    public void The_chosen_year_is_the_first_after_this_year_not_published() =>
        Assert.Equal(ThisYear + 1, HolidayCalendarRules.ChosenYear([ThisYear], ThisYear));

    [Fact]
    public void The_chosen_year_skips_a_published_next_year() =>
        Assert.Equal(ThisYear + 2, HolidayCalendarRules.ChosenYear([ThisYear, ThisYear + 1], ThisYear));

    [Fact]
    public void With_every_year_published_the_chosen_year_is_this_year() =>
        Assert.Equal(ThisYear, HolidayCalendarRules.ChosenYear([ThisYear, ThisYear + 1, ThisYear + 2], ThisYear));
}
