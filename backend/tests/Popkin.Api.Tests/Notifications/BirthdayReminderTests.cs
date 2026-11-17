using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// A contact's key date reaches the inbox and the phone at 8 am where the person is, as the
/// "Birthdays" kind allows (send-reminders; L2-140 AC2, L2-162 AC1, L2-166).
/// </summary>
public sealed class BirthdayReminderTests
{
    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");

    /// <summary>Tomorrow at `hour`:`minute` UTC, after the factory's real start.</summary>
    private static DateTimeOffset Tomorrow(ApiFactory api, int hour, int minute = 0) =>
        new(api.Clock.GetUtcNow().UtcDateTime.Date.AddDays(1).AddHours(hour).AddMinutes(minute), TimeSpan.Zero);

    private static async Task<(Guid Contact, Guid KeyDate)> GraceAsync(HttpClient mara, DateOnly birthday, int? year)
    {
        var added = await mara.AddContactAsync(new
        {
            clientId = Guid.NewGuid(),
            name = "Grace Adeyemi",
            city = "London",
            loves = new[] { "Pottery", "Natural wine" },
        });
        added.EnsureSuccessStatusCode();
        var contact = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var date = await mara.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
        {
            clientId = Guid.NewGuid(),
            kind = "Birthday",
            month = birthday.Month,
            day = birthday.Day,
            year,
            everyYear = true,
            lead = "OneWeekBefore",
        });
        date.EnsureSuccessStatusCode();
        return (contact, (await date.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());
    }

    // Given Mara, by email, who keeps Grace's birthday a week from tomorrow, when the Worker ticks
    // at 7:59 and at 8:00 tomorrow and the dispatcher runs twice, then nothing goes before 8; at
    // 8 one email reaches Mara from "Popkin" with Grace's age, what she loves, her page and the
    // link that stops her birthday reminders, and one alert reaches her phone (L2-162 AC1,
    // L2-166 AC1, AC4, AC6; L2-140 AC2).
    [Fact]
    public async Task A_birthday_reaches_the_inbox_and_the_phone_once_at_eight()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");
        await mara.AllowsAlertsAsync();
        var morning = Tomorrow(api, 7, 59);
        var birthday = DateOnly.FromDateTime(morning.UtcDateTime).AddDays(7);
        var (grace, keyDate) = await GraceAsync(mara, birthday, birthday.Year - 33);
        api.Clock.SetUtcNow(morning);

        var early = await api.SendAsync(new SendContactRemindersCommand());
        await api.DispatchAsync();
        var beforeEight = (api.NotificationEmails.Sent.Count, api.PhoneAlerts.Sent.Count);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var eight = await api.SendAsync(new SendContactRemindersCommand());
        await api.DispatchAsync();
        await api.DispatchAsync();

        Assert.Equal((0, 1), (early, eight));
        Assert.Equal((0, 0), beforeEight);
        var weekday = birthday.ToString("dddd", English);
        var email = Assert.Single(api.NotificationEmails.Sent);
        Assert.Equal("mara@example.com", email.To);
        Assert.Equal("Popkin", email.FromDisplayName);
        Assert.Equal($"Grace’s birthday is {weekday}, {birthday.ToString("MMM d", English)}", email.Email.Subject);
        // A week out, the ruled words name the date; within six days, the weekday (gaps 104, 114).
        var when = ReminderRules.When(birthday, birthday.AddDays(-7));
        Assert.Contains("Grace turns 33 " + when, email.Email.Text);
        Assert.Contains("Things Grace loves, from your notes", email.Email.Text);
        Assert.Contains("Pottery", email.Email.Html);
        Assert.Contains("London", email.Email.Text);
        Assert.Contains($"Open Grace’s page: https://localhost/contacts/people/{grace}", email.Email.Text);
        Assert.Contains("You asked to be reminded 1 week before Grace Adeyemi’s birthday, from your contacts.", email.Email.Text);
        Assert.Contains($"https://localhost/account/notifications?tab=people&stop-birthday={keyDate}", email.Email.Text);
        Assert.Contains("Stop birthday reminders for Grace", email.Email.Text);
        var alert = Assert.Single(api.PhoneAlerts.Sent).Alert;
        Assert.Equal($"Grace turns 33 {when}", alert.Title);
        Assert.Equal($"/contacts/people/{grace}", alert.Url);
    }

    // On the day: "Today: Grace's birthday", "Say happy birthday"; with no year there is no age
    // (L2-166 AC2).
    [Fact]
    public async Task On_the_day_it_says_today_and_offers_to_say_happy_birthday()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");
        var morning = Tomorrow(api, 8);
        var (grace, _) = await GraceAsync(mara, DateOnly.FromDateTime(morning.UtcDateTime), year: null);
        (await mara.PutAsJsonAsync("/api/me/notifications/kinds/Birthdays", new { email = true })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(morning);

        await api.SendAsync(new SendContactRemindersCommand());
        await api.DispatchAsync();

        var email = Assert.Single(api.NotificationEmails.Sent);
        Assert.Equal("Today: Grace’s birthday", email.Email.Subject);
        Assert.Contains("It’s Grace’s birthday today", email.Email.Text);
        Assert.Contains($"Say happy birthday: https://localhost/contacts/people/{grace}", email.Email.Text);
        Assert.DoesNotContain("turns", email.Email.Text);
    }

    // "Birthdays" off by email sends the phone alert only; a follow-up goes to the phone alone,
    // whatever the email switch says (L2-140 AC2, L2-157).
    [Fact]
    public async Task Email_off_for_birthdays_sends_the_phone_only_and_a_follow_up_never_emails()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpByEmailAsync("Mara Okafor", "mara@example.com");
        await mara.AllowsAlertsAsync();
        var morning = Tomorrow(api, 8);
        await GraceAsync(mara, DateOnly.FromDateTime(morning.UtcDateTime).AddDays(7), 1993);
        (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Return Ruth’s ladder",
            dueOn = DateOnly.FromDateTime(morning.UtcDateTime).ToString("yyyy-MM-dd"),
        })).EnsureSuccessStatusCode();
        (await mara.PutAsJsonAsync("/api/me/notifications/kinds/Birthdays", new { email = false })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(morning);

        await api.SendAsync(new SendContactRemindersCommand());
        await api.DispatchAsync();

        Assert.Empty(api.NotificationEmails.Sent);
        Assert.Equal(
            ["Return Ruth’s ladder is due today", "/contacts/follow-ups"],
            api.PhoneAlerts.Sent.Where(a => a.Alert.Title.StartsWith("Return")).Select(a => new[] { a.Alert.Title, a.Alert.Url }).Single());
        Assert.Equal(2, api.PhoneAlerts.Sent.Count);
    }
}
