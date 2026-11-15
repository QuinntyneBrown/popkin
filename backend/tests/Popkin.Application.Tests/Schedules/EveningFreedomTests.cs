using Popkin.Domain;

namespace Popkin.Application.Tests.Schedules;

/// <summary>
/// Who is free on an evening: free means not working between 8 and 11 pm; when everyone is,
/// the headline names the time all are free from and who is the last off shift (L2-074 AC2 to
/// AC4).
/// </summary>
public sealed class EveningFreedomTests
{
    // Each member's stretches for the day, "9:00-17:30" with several split on '+', "" for none;
    // members split on '|'.
    [Theory]
    [InlineData("", true)] // no hours
    [InlineData("9:00-17:30", true)] // a day's work
    [InlineData("9:00-20:00", true)] // ends as the evening starts
    [InlineData("23:00-24:00", true)] // starts as the evening ends
    [InlineData("9:00-20:15", false)] // runs into the evening
    [InlineData("22:45-24:00", false)] // starts in it
    [InlineData("12:00-24:00", false)] // works all evening
    [InlineData("6:00-10:00+21:00-22:00", false)] // a second stretch in the evening
    public void A_member_is_free_when_no_stretch_overlaps_8_to_11_pm(string day, bool free) =>
        Assert.Equal(free, EveningFreedom.IsFree(StretchesOf(day)));

    [Theory]
    // everyone free: from the latest end by 8 pm, at least 5 pm, and who ends then
    [InlineData("9:00-17:30|9:00-19:30|", 3, "19:30", "1")]
    [InlineData("9:00-19:30|10:00-19:30|8:00-16:00", 3, "19:30", "0,1")]
    [InlineData("9:00-17:00|9:00-15:00", 2, "17:00", "")] // nobody works past 5 pm
    [InlineData("|", 2, "17:00", "")] // nobody has hours
    [InlineData("9:00-20:00|23:00-24:00", 2, "20:00", "0")] // a late shift after the evening
    // someone works in the evening: no "free from", nobody named last off shift
    [InlineData("9:00-17:30|14:00-22:00|", 2, null, "")]
    [InlineData("18:00-23:00|14:00-22:00|", 1, null, "")]
    public void The_evening_names_when_everyone_is_free_and_who_is_last_off_shift(
        string members, int freeCount, string? everyoneFreeFrom, string lastOffShift)
    {
        var evening = EveningFreedom.Of(members.Split('|').Select(StretchesOf).ToList());

        Assert.Equal(freeCount, evening.FreeCount);
        Assert.Equal(everyoneFreeFrom, evening.EveryoneFreeFrom is { } from ? Time(from) : null);
        Assert.Equal(lastOffShift, string.Join(",", evening.LastOffShift));
    }

    // Those working in the evening are named, in the members' order (L2-074 AC4).
    [Fact]
    public void Those_working_in_the_evening_are_named_in_order()
    {
        var evening = EveningFreedom.Of([StretchesOf("14:00-22:00"), StretchesOf(""), StretchesOf("18:00-23:30")]);

        Assert.Equal([0, 2], evening.Working);
    }

    private static List<Stretch> StretchesOf(string day) =>
        day.Length == 0
            ? []
            : day.Split('+').Select(stretch =>
            {
                var times = stretch.Split('-');
                return new Stretch(Minutes(times[0]), Minutes(times[1]));
            }).ToList();

    private static int Minutes(string time)
    {
        var parts = time.Split(':');
        return int.Parse(parts[0]) * 60 + int.Parse(parts[1]);
    }

    private static string Time(int minutes) => $"{minutes / 60}:{minutes % 60:00}";
}
