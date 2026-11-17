using Popkin.Application.Notifications.Dispatch;

namespace Popkin.Application.Tests.Notifications;

/// <summary>QuietHours and LocalClock (L2-161 AC6, AC7): 21:00 to 08:00 where the person is.</summary>
public sealed class QuietHoursTests
{
    [Theory]
    [InlineData("20:59", false)]
    [InlineData("21:00", true)]
    [InlineData("23:30", true)]
    [InlineData("00:00", true)]
    [InlineData("07:59", true)]
    [InlineData("08:00", false)]
    [InlineData("12:00", false)]
    public void The_window_crosses_midnight(string time, bool inside) =>
        Assert.Equal(inside, QuietHours.Default.Contains(TimeOnly.Parse(time)));

    [Fact]
    public void A_window_within_one_day_is_kept_too()
    {
        var afternoon = new QuietHours(new TimeOnly(13, 0), new TimeOnly(15, 0));

        Assert.True(afternoon.Contains(new TimeOnly(14, 0)));
        Assert.False(afternoon.Contains(new TimeOnly(15, 0)));
        Assert.False(afternoon.Contains(new TimeOnly(12, 0)));
    }

    // 23:00 in New York (UTC-5 in November) ends at 08:00 there the next day: 13:00 UTC.
    [Fact]
    public void The_end_is_the_next_8_am_where_the_person_is()
    {
        var newYork = LocalClock.ZoneOf("America/New_York");

        var end = QuietHours.Default.EndAfter(new DateTimeOffset(2026, 11, 18, 4, 0, 0, TimeSpan.Zero), newYork);

        Assert.Equal(new DateTimeOffset(2026, 11, 18, 13, 0, 0, TimeSpan.Zero), end);
    }

    // 06:00 is before the same morning's end.
    [Fact]
    public void Early_in_the_morning_the_end_is_the_same_day()
    {
        var end = QuietHours.Default.EndAfter(new DateTimeOffset(2026, 11, 18, 6, 0, 0, TimeSpan.Zero), TimeZoneInfo.Utc);

        Assert.Equal(new DateTimeOffset(2026, 11, 18, 8, 0, 0, TimeSpan.Zero), end);
    }

    [Theory]
    [InlineData("Asia/Tokyo", "Asia/Tokyo")]
    [InlineData(null, "UTC")]
    [InlineData("Mars/Olympus", "UTC")]
    public void The_zone_is_the_saved_one_else_UTC(string? saved, string expected)
    {
        var zone = LocalClock.ZoneOf(saved);

        Assert.Equal(TimeZoneInfo.FindSystemTimeZoneById(expected).BaseUtcOffset, zone.BaseUtcOffset);
    }
}
