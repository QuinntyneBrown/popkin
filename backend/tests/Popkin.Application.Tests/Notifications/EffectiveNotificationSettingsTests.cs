// Traces to: L2-154 AC1, AC2, L2-156 AC2, L2-157 AC4
// Description: A kind's setting is the person's choice where there is one, else the catalogue's default; a required kind is always on by email.
using Popkin.Application.Notifications;
using Popkin.Domain;

namespace Popkin.Application.Tests.Notifications;

public sealed class EffectiveNotificationSettingsTests
{
    private static readonly Guid Mara = Guid.Parse("00000000-0000-0000-0000-00000000000a");
    private static readonly DateTimeOffset Now = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public void With_no_choice_each_kind_follows_the_catalogue()
    {
        var settings = new EffectiveNotificationSettings(null, []);

        Assert.False(settings.IsOn(NotificationKind.GroupChat, NotificationChannel.Email));
        Assert.True(settings.IsOn(NotificationKind.GroupChat, NotificationChannel.Phone));
        Assert.True(settings.EmailOn);
        Assert.Equal(NotificationFrequency.AsItHappens, settings.Frequency);
    }

    [Fact]
    public void A_choice_wins_over_the_default()
    {
        var choice = NotificationKindChoice.For(Mara, NotificationKind.GroupChat);
        choice.Choose(NotificationChannel.Email, true);

        var settings = new EffectiveNotificationSettings(null, [choice]);

        Assert.True(settings.IsOn(NotificationKind.GroupChat, NotificationChannel.Email));
    }

    [Fact]
    public void A_choice_of_one_channel_leaves_the_other_on_its_default()
    {
        var choice = NotificationKindChoice.For(Mara, NotificationKind.NewPhotos);
        choice.Choose(NotificationChannel.Phone, true);

        var settings = new EffectiveNotificationSettings(null, [choice]);

        Assert.True(settings.IsOn(NotificationKind.NewPhotos, NotificationChannel.Phone));
        Assert.True(settings.IsOn(NotificationKind.NewPhotos, NotificationChannel.Email));
    }

    [Fact]
    public void A_required_kind_is_on_by_email_and_off_by_phone_whatever_is_stored()
    {
        var choice = NotificationKindChoice.For(Mara, NotificationKind.SignInAndSecurity);
        choice.Choose(NotificationChannel.Email, false);
        choice.Choose(NotificationChannel.Phone, true);

        var settings = new EffectiveNotificationSettings(null, [choice]);

        Assert.True(settings.IsOn(NotificationKind.SignInAndSecurity, NotificationChannel.Email));
        Assert.False(settings.IsOn(NotificationKind.SignInAndSecurity, NotificationChannel.Phone));
    }

    [Fact]
    public void The_persons_own_email_switch_and_frequency_are_read_from_their_preferences()
    {
        var preferences = NotificationPreferences.For(Mara);
        preferences.TurnEmail(false, Now);
        preferences.ChooseFrequency(NotificationFrequency.DailyDigest, Now);

        var settings = new EffectiveNotificationSettings(preferences, []);

        Assert.False(settings.EmailOn);
        Assert.Equal(NotificationFrequency.DailyDigest, settings.Frequency);
    }

    // A person who hasn't chosen how often gets the Owner's default; one who chose keeps theirs (L2-173).
    [Fact]
    public void The_frequency_not_chosen_is_the_owners_default()
    {
        var chose = NotificationPreferences.For(Mara);
        chose.ChooseFrequency(NotificationFrequency.AsItHappens, Now);

        Assert.Equal(NotificationFrequency.WeeklyDigest, new EffectiveNotificationSettings(null, [], NotificationFrequency.WeeklyDigest).Frequency);
        Assert.Equal(NotificationFrequency.WeeklyDigest, new EffectiveNotificationSettings(NotificationPreferences.For(Mara), [], NotificationFrequency.WeeklyDigest).Frequency);
        Assert.Equal(NotificationFrequency.AsItHappens, new EffectiveNotificationSettings(chose, [], NotificationFrequency.WeeklyDigest).Frequency);
    }
}
