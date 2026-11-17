using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Reminders;

namespace Popkin.Api.Tests.Notifications;

/// <summary>
/// The two reminders a Popkin sends: a story due tomorrow, to its owner at 6 pm the day before,
/// and the Popkin wrapping up, to every member 24 hours before its end (send-reminders; L2-162,
/// L2-167).
/// </summary>
public sealed class PopkinReminderTests
{
    private static readonly CultureInfo English = CultureInfo.GetCultureInfo("en-GB");

    private static DateTimeOffset At(DateOnly day, int hour, int minute = 0) =>
        new(day.ToDateTime(new TimeOnly(hour, minute)), TimeSpan.Zero);

    private static DateOnly Today(ApiFactory api) => DateOnly.FromDateTime(api.Clock.GetUtcNow().UtcDateTime);

    /// <summary>Grace, by email, starts Cabin Week until `endsAt`; or another host, another Popkin.</summary>
    private static async Task<(HttpClient Grace, Guid PopkinId, string Code)> CabinWeekAsync(
        ApiFactory api, DateTimeOffset endsAt, string host = "Grace Adeyemi", string email = "grace@example.com", string name = "Cabin Week")
    {
        var grace = await api.SignedUpByEmailAsync(host, email);
        var created = await grace.PostAsJsonAsync("/api/popkins", new { name, emoji = "🏕️", colour = "Leaf", length = "UntilDate", endsAt });
        created.EnsureSuccessStatusCode();
        var body = await created.Content.ReadFromJsonAsync<JsonElement>();
        return (grace, body.GetProperty("id").GetGuid(), body.GetProperty("inviteCode").GetString()!);
    }

    private static async Task<Guid> OwnedStoryAsync(HttpClient owner, Guid popkinId, string title, DateOnly dueDate)
    {
        var me = await owner.MembershipIdAsync(popkinId);
        var added = await owner.AddStoryAsync(popkinId, title, ownerMembershipId: me);
        added.EnsureSuccessStatusCode();
        var id = (await added.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        (await owner.SaveStoryAsync(popkinId, id, title, tag: "Stay", ownerMembershipId: me, dueDate: dueDate.ToString("yyyy-MM-dd"))).EnsureSuccessStatusCode();
        return id;
    }

    private static List<OutgoingEmailMessage> Sent(ApiFactory api, string subjectStart) =>
        api.NotificationEmails.Sent.Where(e => e.Email.Subject.StartsWith(subjectStart, StringComparison.Ordinal)).ToList();

    // Given Grace's story "Book the cabin", hers and due in two days, when the Worker ticks at
    // 17:59 and 18:00 the day before and again at 18:05, with the dispatcher after each, then
    // nothing goes before 18:00; at 18:00 one email reaches her with its title, "Due tomorrow",
    // "Yours" and "Open the plan", and one alert reaches her phone (L2-162 AC1, AC4; L2-167 AC1, AC3).
    [Fact]
    public async Task A_story_due_tomorrow_reaches_its_owner_once_at_six_the_day_before()
    {
        using var api = new ApiFactory();
        var due = Today(api).AddDays(2);
        var (grace, popkin, _) = await CabinWeekAsync(api, At(Today(api).AddDays(10), 18));
        await grace.AllowsAlertsAsync();
        await OwnedStoryAsync(grace, popkin, "Book the cabin", due);
        api.Clock.SetUtcNow(At(due.AddDays(-1), 17, 59));

        var early = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();
        api.Clock.SetUtcNow(At(due.AddDays(-1), 18));
        var six = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        var again = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();

        Assert.Equal((0, 1, 0), (early, six, again));
        var email = Assert.Single(Sent(api, "Due tomorrow"));
        Assert.Equal("grace@example.com", email.To);
        Assert.Equal("Due tomorrow: Book the cabin", email.Email.Subject);
        Assert.Contains($"Due tomorrow, {due.ToString("dddd", English)}.", email.Email.Text);
        Assert.Contains("Yours", email.Email.Text);
        Assert.Contains("Stay", email.Email.Text);
        Assert.Contains($"Open the plan: https://localhost/p/{popkin}/plan", email.Email.Text);
        Assert.Contains("You’re getting this because a story of yours in Cabin Week is due tomorrow.", email.Email.Text);
        Assert.Contains("Mute Cabin Week", email.Email.Text);
        var alert = Assert.Single(api.PhoneAlerts.Sent, a => a.Alert.Title.StartsWith("Due tomorrow", StringComparison.Ordinal)).Alert;
        Assert.Equal("Due tomorrow: Book the cabin", alert.Title);
        Assert.Equal($"/p/{popkin}/plan", alert.Url);
    }

    // A story done before its reminder is sent sends nothing; a story given a new day reminds
    // again the day before that one (L2-162 AC2, L2-174 AC1).
    [Fact]
    public async Task A_story_done_sends_nothing_and_a_new_due_date_reminds_again()
    {
        using var api = new ApiFactory();
        var due = Today(api).AddDays(2);
        var (grace, popkin, _) = await CabinWeekAsync(api, At(Today(api).AddDays(10), 18));
        var cabin = await OwnedStoryAsync(grace, popkin, "Book the cabin", due);
        var canoe = await OwnedStoryAsync(grace, popkin, "Hire a canoe", due);
        api.Clock.SetUtcNow(At(due.AddDays(-1), 18));

        await api.SendAsync(new SendPopkinRemindersCommand());
        (await grace.MoveStoryAsync(popkin, cabin, "Done")).EnsureSuccessStatusCode();
        await api.DispatchAsync();
        var me = await grace.MembershipIdAsync(popkin);
        (await grace.SaveStoryAsync(popkin, canoe, "Hire a canoe", tag: "Stay", ownerMembershipId: me, dueDate: due.AddDays(3).ToString("yyyy-MM-dd"))).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(At(due.AddDays(2), 18));
        await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();

        Assert.Equal(["Due tomorrow: Hire a canoe", "Due tomorrow: Hire a canoe"], Sent(api, "Due tomorrow").Select(e => e.Email.Subject));
    }

    // Given Cabin Week ending in three days at 6 pm, with Grace and Ellie, Ellie having muted it,
    // when the Worker ticks a minute before and at 24 hours before its end, then each member gets
    // one wrap-up email at that moment, with the time it ends and "Add your photos", and a second
    // tick sends nothing (L2-158 AC3, L2-162 AC1, AC4, L2-167 AC2, AC4).
    [Fact]
    public async Task Every_member_hears_once_a_day_before_the_Popkin_wraps_up_muted_or_not()
    {
        using var api = new ApiFactory();
        var endsAt = At(Today(api).AddDays(3), 18);
        var (grace, popkin, code) = await CabinWeekAsync(api, endsAt);
        var ellie = await api.JoinedByEmailAsync(code, "Ellie Park", "ellie@example.com");
        (await ellie.PutAsJsonAsync($"/api/me/notifications/popkins/{popkin}", new { level = "Muted" })).EnsureSuccessStatusCode();
        api.Clock.SetUtcNow(endsAt.AddHours(-24).AddMinutes(-1));

        var early = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();
        api.Clock.SetUtcNow(endsAt.AddHours(-24));
        var onTime = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();
        var again = await api.SendAsync(new SendPopkinRemindersCommand());
        await api.DispatchAsync();

        Assert.Equal((0, 1, 0), (early, onTime, again));
        var sent = Sent(api, "Cabin Week wraps up");
        Assert.Equal(["ellie@example.com", "grace@example.com"], sent.Select(e => e.To).Order(StringComparer.Ordinal));
        var email = sent[0];
        Assert.Equal("Cabin Week wraps up in 24 hours", email.Email.Subject);
        Assert.Contains("Cabin Week wraps up tomorrow at 6 pm", email.Email.Text);
        Assert.Contains("After that the chat closes and the album becomes a keepsake. Photos you add now make the recap.", email.Email.Text);
        Assert.Contains($"Add your photos: https://localhost/p/{popkin}/photos", email.Email.Text);
        Assert.Contains("Everyone in a Popkin gets this once, a day before it wraps up.", email.Email.Text);
        Assert.DoesNotContain("You’ve added", email.Email.Text);
    }

    // A Popkin that started less than 24 hours before its end sends no wrap-up reminder; one with
    // no end never does (send-reminders, "A short Popkin").
    [Fact]
    public async Task A_short_Popkin_and_one_that_keeps_going_send_no_wrap_up()
    {
        using var api = new ApiFactory();
        var endsAt = api.Clock.GetUtcNow().AddHours(23);
        await CabinWeekAsync(api, endsAt);
        await api.StartLakesideAsync("KeepItGoing");
        api.Clock.SetUtcNow(endsAt.AddHours(-1));

        Assert.Equal(0, await api.SendAsync(new SendPopkinRemindersCommand()));
    }

    // No reminder for a story with no owner, with no due date or already done, in a Popkin whose
    // Host switched Plan off, or in one that has wrapped up (send-reminders, "Stories due").
    [Fact]
    public async Task Only_an_owned_open_story_with_a_day_in_a_live_Popkin_with_Plan_reminds()
    {
        using var api = new ApiFactory();
        var due = Today(api).AddDays(2);
        var (grace, popkin, _) = await CabinWeekAsync(api, At(Today(api).AddDays(10), 18));
        var me = await grace.MembershipIdAsync(popkin);
        (await grace.AddStoryAsync(popkin, "Nobody’s yet")).EnsureSuccessStatusCode();
        (await grace.AddStoryAsync(popkin, "No day yet", ownerMembershipId: me)).EnsureSuccessStatusCode();
        var done = await OwnedStoryAsync(grace, popkin, "Done already", due);
        (await grace.MoveStoryAsync(popkin, done, "Done")).EnsureSuccessStatusCode();
        var (ruth, tigers, _) = await CabinWeekAsync(api, At(Today(api).AddDays(10), 18), "Ruth Bell", "ruth@example.com", "Tigers U9");
        await OwnedStoryAsync(ruth, tigers, "Bring oranges", due);
        (await ruth.PutAsJsonAsync($"/api/popkins/{tigers}/features", new { plan = false })).EnsureSuccessStatusCode();
        var (dev, quiz, _) = await CabinWeekAsync(api, At(Today(api).AddDays(10), 18), "Dev Patel", "dev@example.com", "Quiz Night");
        await OwnedStoryAsync(dev, quiz, "Write round three", due);
        await api.WrapUpAsync(quiz);
        api.Clock.SetUtcNow(At(due.AddDays(-1), 18));

        Assert.Equal(0, await api.SendAsync(new SendPopkinRemindersCommand()));
    }
}
