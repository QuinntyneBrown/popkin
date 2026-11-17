using Popkin.Domain;

namespace Popkin.Application.Tests.Administration;

/// <summary>Each default's range, one case per row of the design's table (L2-173 AC3).</summary>
public sealed class NotificationDefaultsRulesTests
{
    private static readonly NotificationDefaults First = NotificationDefaults.First;

    public static TheoryData<NotificationDefaults, string?> Rows => new()
    {
        { First, null },
        { First with { BundleMinutes = 1 }, null },
        { First with { BundleMinutes = 60 }, null },
        { First with { BundleMinutes = 0 }, "bundleMinutes" },
        { First with { BundleMinutes = 61 }, "bundleMinutes" },
        { First with { MostEmailsPerDay = 1 }, null },
        { First with { MostEmailsPerDay = 100 }, null },
        { First with { MostEmailsPerDay = 0 }, "mostEmailsPerDay" },
        { First with { MostEmailsPerDay = 101 }, "mostEmailsPerDay" },
        { First with { QuietFrom = new TimeOnly(22, 30) }, null },
        { First with { QuietFrom = new TimeOnly(22, 15) }, "quietFrom" },
        { First with { QuietTo = new TimeOnly(7, 45) }, "quietTo" },
        { First with { QuietFrom = new TimeOnly(8, 0) }, "quietTo" },
        { First with { BirthdayLead = null }, null },
        { First with { BirthdayLead = ReminderLead.OnTheDay }, null },
        { First with { BirthdayLead = ReminderLead.TwoWeeksBefore }, "birthdayLead" },
        { First with { BirthdayLead = ReminderLead.OneMonthBefore }, "birthdayLead" },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Each_value_is_checked_against_its_range(NotificationDefaults defaults, string? field) =>
        Assert.Equal(field, NotificationDefaultsRules.Check(defaults)?.Field);

    [Fact]
    public void Saving_what_is_saved_changes_nothing()
    {
        var platform = NotificationPlatform.Defaults();

        Assert.False(platform.ChangeDefaults(First, "Lena Fischer", DateTimeOffset.UnixEpoch));
        Assert.Null(platform.DefaultsChangedAt);
        Assert.True(platform.ChangeDefaults(First with { MostEmailsPerDay = 20 }, "Lena Fischer", DateTimeOffset.UnixEpoch));
        Assert.Equal(20, platform.DailyMost);
        Assert.Equal("Lena Fischer", platform.DefaultsChangedByName);
    }
}
