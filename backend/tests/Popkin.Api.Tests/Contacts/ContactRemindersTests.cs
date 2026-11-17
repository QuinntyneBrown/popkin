// Acceptance Test
// Traces to: L2-140, L2-133 AC2, L2-145 AC4, L2-122, ADR 0028, known gaps 104 and 114 (ruled)
// Description: At 9 am where the owner is, the Worker's command adds each reminder once, sends it to the phone when that is on, and on Monday sends the week ahead once; the owner reads and dismisses only their own; the zone and the devices are saved.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Contacts.Reminders;

namespace Popkin.Api.Tests.Contacts;

public sealed class ContactRemindersTests
{
    /// <summary>The next Monday after the factory's real start, at `hour` UTC.</summary>
    private static DateTimeOffset NextMonday(ApiFactory api, int hour, int minute = 0)
    {
        var now = api.Clock.GetUtcNow().UtcDateTime.Date;
        var days = ((int)DayOfWeek.Monday - (int)now.DayOfWeek + 7) % 7;
        return new DateTimeOffset(now.AddDays(days == 0 ? 7 : days).AddHours(hour).AddMinutes(minute), TimeSpan.Zero);
    }

    private static async Task<HttpClient> SignedUpByEmailAsync(ApiFactory api, string name, string email)
    {
        var client = api.CreateBrowserClient();
        var verificationId = await client.RequestCodeAsync(email, "Email");
        var code = api.Codes.Sent.Last().Code;
        (await client.PostAsJsonAsync($"/api/auth/codes/{verificationId}/confirm", new { code, name })).EnsureSuccessStatusCode();
        return client;
    }

    private static async Task<Guid> BirthdayAsync(HttpClient owner, string name, DateOnly on, int year)
    {
        var contact = (await owner.AddedContactAsync(name)).GetProperty("id").GetGuid();
        (await owner.PostAsJsonAsync($"/api/contacts/people/{contact}/key-dates", new
        {
            clientId = Guid.NewGuid(),
            kind = "Birthday",
            month = on.Month,
            day = on.Day,
            year,
            everyYear = true,
            lead = "OneWeekBefore",
        })).EnsureSuccessStatusCode();
        return contact;
    }

    private static async Task<JsonElement[]> RemindersAsync(HttpClient owner) =>
        (await owner.GetFromJsonAsync<JsonElement[]>("/api/contacts/reminders"))!;

    // Given Mara, signed in by email, who keeps Grace's birthday on Saturday, and Lena, who keeps none,
    // when the Worker ticks at 8:59 and at 9:00 on Monday, and again at 9:05,
    // then nothing is added before 9; at 9 "Grace turns 33 on Saturday" is added once, sent to her
    // phone once, and the week ahead is emailed to her once; she reads it with Grace's first name,
    // dismisses it, and it is gone; dismissing twice changes nothing; Lena cannot dismiss it
    // (L2-140 AC1 to AC3, L2-122).
    [Fact]
    public async Task A_reminder_comes_once_at_nine_by_the_app_the_phone_and_the_Monday_email()
    {
        using var api = new ApiFactory();
        var mara = await SignedUpByEmailAsync(api, "Mara Okafor", "mara@example.com");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var monday = NextMonday(api, 8, 59);
        var saturday = DateOnly.FromDateTime(monday.UtcDateTime).AddDays(5);
        var grace = await BirthdayAsync(mara, "Grace Lin", saturday, saturday.Year - 33);
        api.Clock.SetUtcNow(monday);

        var early = await api.SendAsync(new SendContactRemindersCommand());
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var nine = await api.SendAsync(new SendContactRemindersCommand());
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        var again = await api.SendAsync(new SendContactRemindersCommand());

        Assert.Equal((0, 1, 0), (early, nine, again));
        var phone = Assert.Single(api.PhoneReminders.Sent);
        Assert.Equal("Grace turns 33 on Saturday", phone.Reminder.Words);
        Assert.Equal(grace, phone.Reminder.ContactId);
        var email = Assert.Single(api.WeekAheadEmails.Sent);
        Assert.Equal("mara@example.com", email.Email);
        Assert.Equal(["Grace turns 33 on Saturday"], email.Week.Dates);
        var reminder = Assert.Single(await RemindersAsync(mara));
        Assert.Equal("Grace turns 33 on Saturday", reminder.GetProperty("words").GetString());
        Assert.Equal("Grace", reminder.GetProperty("firstName").GetString());
        Assert.Equal(grace, reminder.GetProperty("contactId").GetGuid());
        Assert.Empty(await RemindersAsync(lena));

        var id = reminder.GetProperty("id").GetGuid();
        var notHers = await lena.PostAsync($"/api/contacts/reminders/{id}/dismissal", null);
        var dismissed = await mara.PostAsync($"/api/contacts/reminders/{id}/dismissal", null);
        var twice = await mara.PostAsync($"/api/contacts/reminders/{id}/dismissal", null);

        Assert.Equal(HttpStatusCode.NotFound, notHers.StatusCode);
        Assert.Equal("reminder_not_found", (await notHers.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NoContent, dismissed.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, twice.StatusCode);
        Assert.Empty(await RemindersAsync(mara));
    }

    // Given Mara in Los Angeles with both ways off, when the Worker ticks at 9 am UTC and at 9 am
    // in Los Angeles, then the reminder waits for 9 am there, and goes neither to the phone nor by
    // email; a zone the server does not know is refused (L2-140 AC1 to AC3, known gap 104).
    [Fact]
    public async Task Nine_am_is_where_the_owner_is_and_the_switches_are_kept()
    {
        using var api = new ApiFactory();
        var mara = await SignedUpByEmailAsync(api, "Mara Okafor", "mara@example.com");
        var monday = NextMonday(api, 9);
        var saturday = DateOnly.FromDateTime(monday.UtcDateTime).AddDays(5);
        await BirthdayAsync(mara, "Grace Lin", saturday, saturday.Year - 33);
        var zone = await mara.PutAsJsonAsync("/api/contacts/time-zone", new { zone = "America/Los_Angeles" });
        var wrong = await mara.PutAsJsonAsync("/api/contacts/time-zone", new { zone = "Lakeside/Weekend" });
        (await mara.PutAsJsonAsync("/api/contacts/reminder-preferences", new
        {
            birthdayLead = "OneWeekBefore", anniversaryLead = "ThreeDaysBefore", milestoneLead = "OnTheDay",
            phoneNotifications = false, mondayEmail = false,
        })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(monday);

        var utcNine = await api.SendAsync(new SendContactRemindersCommand());
        api.Clock.Advance(TimeSpan.FromHours(8));
        var losAngelesNine = await api.SendAsync(new SendContactRemindersCommand());

        Assert.Equal(HttpStatusCode.NoContent, zone.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal("invalid_time_zone", (await wrong.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal((0, 1), (utcNine, losAngelesNine));
        Assert.Single(await RemindersAsync(mara));
        Assert.Empty(api.PhoneReminders.Sent);
        Assert.Empty(api.WeekAheadEmails.Sent);
    }

    // Given Mara's weekly lunch with Chidi, started today, and her follow-up due in a week, when the
    // Worker ticks a week on and the day after, then the follow-up and the habit remind on their
    // day, and the habit, not kept, reminds again the day after as overdue (L2-133 AC2, L2-145 AC4).
    [Fact]
    public async Task A_follow_up_and_a_habit_remind_on_their_day_and_a_slipped_habit_the_day_after()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var weekOn = new DateTimeOffset(api.Clock.GetUtcNow().UtcDateTime.Date.AddDays(7).AddHours(9), TimeSpan.Zero);
        var chidi = (await mara.AddedContactAsync("Chidi Okafor")).GetProperty("id").GetGuid();
        (await mara.PostAsJsonAsync("/api/contacts/habits", new { clientId = Guid.NewGuid(), contactId = chidi, what = "Lunch", rhythm = "Weekly" }))
            .EnsureSuccessStatusCode();
        (await mara.PostAsJsonAsync("/api/contacts/follow-ups", new
        {
            clientId = Guid.NewGuid(),
            text = "Return Ruth’s ladder",
            dueOn = DateOnly.FromDateTime(weekOn.UtcDateTime).ToString("yyyy-MM-dd"),
        })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(weekOn);

        var onTheDay = await api.SendAsync(new SendContactRemindersCommand());
        api.Clock.Advance(TimeSpan.FromDays(1));
        var dayAfter = await api.SendAsync(new SendContactRemindersCommand());

        Assert.Equal((2, 1), (onTheDay, dayAfter));
        Assert.Equal(
            ["Lunch with Chidi is due today", "Lunch with Chidi is overdue", "Return Ruth’s ladder is due today"],
            (await RemindersAsync(mara)).Select(r => r.GetProperty("words").GetString()).Order(StringComparer.Ordinal));
    }

    // Given Mara and Lena with a birthday each, when the phone sender fails at 9 and works at 9:05,
    // then both reminders are in the app at 9, and each goes to the phone at 9:05 (L2-140 AC2).
    [Fact]
    public async Task A_phone_that_fails_is_tried_again_and_the_app_still_shows_it()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var lena = await api.SignedUpAsync("Lena Fischer", "(415) 555-0123");
        var monday = NextMonday(api, 9);
        var saturday = DateOnly.FromDateTime(monday.UtcDateTime).AddDays(5);
        await BirthdayAsync(mara, "Grace Lin", saturday, saturday.Year - 33);
        await BirthdayAsync(lena, "Bea Fischer", saturday, saturday.Year - 40);
        api.Clock.SetUtcNow(monday);
        api.PhoneReminders.Fail = true;

        var nine = await api.SendAsync(new SendContactRemindersCommand());
        api.PhoneReminders.Fail = false;
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        await api.SendAsync(new SendContactRemindersCommand());

        Assert.Equal(2, nine);
        Assert.Single(await RemindersAsync(mara));
        Assert.Single(await RemindersAsync(lena));
        Assert.Equal(["Bea turns 40 on Saturday", "Grace turns 33 on Saturday"], api.PhoneReminders.Sent.Select(s => s.Reminder.Words).Order(StringComparer.Ordinal));
    }

    // Given no Web Push key, when Mara's device subscribes, subscribes again and unsubscribes, then
    // the key reads empty, each answers 204, and an endpoint that is not https is refused (ADR 0028).
    [Fact]
    public async Task A_device_subscribes_once_and_unsubscribes()
    {
        using var api = new ApiFactory();
        var mara = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var device = new { endpoint = "https://push.example.com/send/abc", p256dh = "BNcRd", auth = "tBHI" };

        var key = await mara.GetFromJsonAsync<JsonElement>("/api/contacts/push-key");
        var first = await mara.PostAsJsonAsync("/api/contacts/push-subscriptions", device);
        var again = await mara.PostAsJsonAsync("/api/contacts/push-subscriptions", device);
        var plain = await mara.PostAsJsonAsync("/api/contacts/push-subscriptions", device with { endpoint = "http://push.example.com/send/abc" });
        var removed = await mara.DeleteAsync($"/api/contacts/push-subscriptions?endpoint={Uri.EscapeDataString(device.endpoint)}");

        Assert.Equal("", key.GetProperty("publicKey").GetString());
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, plain.StatusCode);
        Assert.Equal("invalid_push_subscription", (await plain.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
    }
}
