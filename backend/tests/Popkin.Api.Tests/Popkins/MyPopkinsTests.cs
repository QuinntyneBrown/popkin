using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>GET /api/popkins, My Popkins (L2-017, L2-018, L2-027 AC3, L2-051, L2-052, L2-054 AC2).</summary>
public sealed class MyPopkinsTests
{
    private static Task<JsonElement> MyPopkinsAsync(HttpClient person) =>
        person.GetFromJsonAsync<JsonElement>("/api/popkins");

    private static List<string> Names(JsonElement list) =>
        list.EnumerateArray().Select(p => p.GetProperty("name").GetString()!).ToList();

    private static async Task<Guid> StartAsync(HttpClient host, string name, string emoji, string colour)
    {
        var response = await host.PostAsJsonAsync("/api/popkins", new { name, emoji, colour, length = "KeepItGoing" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    // Given Lakeside Weekend with its Host, four more members and Joel, and a message by the Host,
    // when Joel reads My Popkins,
    // then Lakeside is a card with its look, its end, its six members with the first three as
    // avatars, the latest message with its sender's first name, Joel's unread count, the Everyone
    // thread and Joel's own membership; and nothing is wrapped up.
    [Fact]
    public async Task A_member_reads_each_active_Popkin_as_a_card()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Nair", "Tomas Lindqvist", "Dana Whitfield", "Sam Ortega");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira")).Content.ReadFromJsonAsync<JsonElement>();
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Boats at ten <b>sharp</b>");

        var response = await joel.GetAsync("/api/popkins");
        var raw = await response.Content.ReadAsStringAsync();
        var mine = JsonDocument.Parse(raw).RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["active", "wrappedUp"], mine.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(0, mine.GetProperty("wrappedUp").GetArrayLength());
        var card = Assert.Single(mine.GetProperty("active").EnumerateArray());
        Assert.Equal(
            ["avatars", "colour", "emoji", "endsAt", "everyoneThreadId", "id", "latestMessage", "memberCount", "name", "unreadCount", "viewerMembershipId"],
            card.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(lakeside.Id, card.GetProperty("id").GetGuid());
        Assert.Equal("Lakeside Weekend", card.GetProperty("name").GetString());
        Assert.Equal("🏕️", card.GetProperty("emoji").GetString());
        Assert.Equal("Teal", card.GetProperty("colour").GetString());
        Assert.Equal(lakeside.EndsAt, card.GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal(6, card.GetProperty("memberCount").GetInt32());
        Assert.Equal(["MO", "PN", "TL"], card.GetProperty("avatars").EnumerateArray().Select(a => a.GetProperty("initials").GetString()));
        Assert.Equal(["accent", "initials", "photoUrl"], card.GetProperty("avatars")[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["firstName", "text"], card.GetProperty("latestMessage").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Mara", card.GetProperty("latestMessage").GetProperty("firstName").GetString());
        // The text is the text, as typed: it is never markup (L2-052).
        Assert.Equal("Boats at ten <b>sharp</b>", card.GetProperty("latestMessage").GetProperty("text").GetString());
        Assert.Equal(1, card.GetProperty("unreadCount").GetInt32());
        Assert.Equal(threadId, card.GetProperty("everyoneThreadId").GetGuid());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), card.GetProperty("viewerMembershipId").GetGuid());
        // No phone number and no email of any member (L2-054 AC2).
        Assert.DoesNotContain("4155550148", raw);
        Assert.DoesNotContain("4155550123", raw);
        Assert.DoesNotContain("@", raw);
        Assert.DoesNotContain("example.com", raw);
    }

    // Given a member with a profile photo,
    // when another member reads My Popkins,
    // then that member's avatar carries the photo's expiring address.
    [Fact]
    public async Task An_avatar_carries_the_expiring_address_of_a_members_photo()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        (await joel.JoinAsync(lakeside.Code, "Joel Ferreira", TestPhotos.FromAPhone())).EnsureSuccessStatusCode();

        var mine = await MyPopkinsAsync(lakeside.Host);
        var home = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");

        var avatars = mine.GetProperty("active")[0].GetProperty("avatars");
        Assert.Equal(JsonValueKind.Null, avatars[0].GetProperty("photoUrl").ValueKind);
        Assert.Equal(home.GetProperty("avatars")[1].GetProperty("photoUrl").GetString(), avatars[1].GetProperty("photoUrl").GetString());
        Assert.False(string.IsNullOrEmpty(avatars[1].GetProperty("photoUrl").GetString()));
    }

    // Given a Popkin where nobody has written, though someone popped in,
    // when its Host reads My Popkins, then the card has no latest message;
    // given a message that was written and then deleted after an earlier one,
    // then the latest message is the earlier one.
    [Fact]
    public async Task The_latest_message_is_the_latest_a_member_wrote_and_none_when_nobody_has()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");

        var quiet = await MyPopkinsAsync(lakeside.Host);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "Morning!");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var mistake = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Sent by mistake", mistake);
        await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages/client/{mistake}");
        var written = await MyPopkinsAsync(lakeside.Host);

        Assert.Equal(JsonValueKind.Null, quiet.GetProperty("active")[0].GetProperty("latestMessage").ValueKind);
        var latest = written.GetProperty("active")[0].GetProperty("latestMessage");
        Assert.Equal("Joel", latest.GetProperty("firstName").GetString());
        Assert.Equal("Morning!", latest.GetProperty("text").GetString());
    }

    // Given messages a member has not read in one of their two Popkins,
    // when they read My Popkins, then each card's unread count is what the home and the thread say;
    // when they mark the thread read, then theirs is 0 and the other member's count has not moved.
    [Fact]
    public async Task The_unread_count_is_the_readers_own_and_agrees_with_the_home_and_the_thread()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var bookClubId = await StartAsync(joel, "Book Club", "📚", "Plum");
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var latest = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "Morning!");

        var before = await MyPopkinsAsync(joel);
        var home = await joel.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        var thread = await joel.EveryoneThreadAsync(lakeside.Id);
        var maraBefore = await MyPopkinsAsync(lakeside.Host);
        var maraHome = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        await joel.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/read", new { lastReadMessageId = latest.GetProperty("id").GetGuid() });
        var after = await MyPopkinsAsync(joel);
        var maraAfter = await MyPopkinsAsync(lakeside.Host);

        int Unread(JsonElement mine, Guid popkinId) =>
            mine.GetProperty("active").EnumerateArray().Single(p => p.GetProperty("id").GetGuid() == popkinId).GetProperty("unreadCount").GetInt32();
        Assert.Equal(2, Unread(before, lakeside.Id));
        Assert.Equal(home.GetProperty("unreadCount").GetInt32(), Unread(before, lakeside.Id));
        Assert.Equal(thread.GetProperty("unreadCount").GetInt32(), Unread(before, lakeside.Id));
        Assert.Equal(0, Unread(before, bookClubId));
        Assert.Equal(0, Unread(after, lakeside.Id));
        // Mara has read nothing: the note that Joel popped in and his message are new to her.
        Assert.Equal(2, Unread(maraBefore, lakeside.Id));
        Assert.Equal(maraHome.GetProperty("unreadCount").GetInt32(), Unread(maraBefore, lakeside.Id));
        Assert.Equal(2, Unread(maraAfter, lakeside.Id));
    }

    // Given a member of three Popkins, started one after another,
    // when they read My Popkins, then the one started last is first;
    // when a message is written in the oldest, then that one is first.
    [Fact]
    public async Task Active_Popkins_come_the_most_recently_active_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await StartAsync(lakeside.Host, "Book Club", "📚", "Plum");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await StartAsync(lakeside.Host, "Beach Day", "🏖️", "Sky");

        var started = await MyPopkinsAsync(lakeside.Host);
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Who's bringing the firewood?");
        var written = await MyPopkinsAsync(lakeside.Host);

        Assert.Equal(["Beach Day", "Book Club", "Lakeside Weekend"], Names(started.GetProperty("active")));
        Assert.Equal(["Lakeside Weekend", "Beach Day", "Book Club"], Names(written.GetProperty("active")));
    }

    // Given Popkins the caller does not belong to, and one they have left,
    // when they read My Popkins, then it lists only those they are in;
    // a person in no Popkin reads two empty lists, and no session answers 401.
    [Fact]
    public async Task Only_the_callers_own_Popkins_are_listed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        await StartAsync(joel, "Book Club", "📚", "Plum");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        var maras = await MyPopkinsAsync(lakeside.Host);
        var joels = await MyPopkinsAsync(joel);
        var sams = await MyPopkinsAsync(sam);
        await api.LeaveAsync(lakeside.Id, "Joel");
        var joelsAfterLeaving = await MyPopkinsAsync(joel);
        var anonymous = await api.CreateBrowserClient().GetAsync("/api/popkins");

        Assert.Equal(["Lakeside Weekend"], Names(maras.GetProperty("active")));
        Assert.Equal(["Book Club", "Lakeside Weekend"], Names(joels.GetProperty("active")).Order());
        Assert.Equal(0, sams.GetProperty("active").GetArrayLength());
        Assert.Equal(0, sams.GetProperty("wrappedUp").GetArrayLength());
        Assert.Equal(["Book Club"], Names(joelsAfterLeaving.GetProperty("active")));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    // Given a member of three Popkins, of which Lakeside wrapped up and then Book Club did,
    // (wrapped up straight in the store: wrapping up is journey 9)
    // when they read My Popkins,
    // then the two are listed as wrapped up, the latest first, each with its look, when it
    // wrapped up and how many people and photos it has, and only the third is active;
    // a member of Lakeside alone reads no active Popkin, and a stranger reads nothing.
    [Fact]
    public async Task Wrapped_up_Popkins_are_listed_apart_the_most_recently_wrapped_up_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        var bookClubId = await StartAsync(lakeside.Host, "Book Club", "📚", "Plum");
        await StartAsync(lakeside.Host, "Beach Day", "🏖️", "Sky");
        await api.AddPhotosAsync(lakeside.Id, "Joel Ferreira", 3, TimeSpan.FromMinutes(1));
        await api.AddPhotosAsync(bookClubId, "Mara Okafor", 1, TimeSpan.FromMinutes(1));
        api.Clock.Advance(TimeSpan.FromHours(1));
        await api.WrapUpAsync(lakeside.Id);
        var lakesideWrappedUpAt = api.Clock.GetUtcNow();
        api.Clock.Advance(TimeSpan.FromHours(1));
        await api.WrapUpAsync(bookClubId);
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        var maras = await MyPopkinsAsync(lakeside.Host);
        var joels = await MyPopkinsAsync(joel);
        var sams = await MyPopkinsAsync(sam);

        Assert.Equal(["Beach Day"], Names(maras.GetProperty("active")));
        Assert.Equal(["Book Club", "Lakeside Weekend"], Names(maras.GetProperty("wrappedUp")));
        var row = maras.GetProperty("wrappedUp")[1];
        Assert.Equal(
            ["colour", "emoji", "id", "name", "peopleCount", "photoCount", "wrappedUpAt"],
            row.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(lakeside.Id, row.GetProperty("id").GetGuid());
        Assert.Equal("🏕️", row.GetProperty("emoji").GetString());
        Assert.Equal("Teal", row.GetProperty("colour").GetString());
        Assert.Equal(lakesideWrappedUpAt, row.GetProperty("wrappedUpAt").GetDateTimeOffset());
        Assert.Equal(2, row.GetProperty("peopleCount").GetInt32());
        Assert.Equal(3, row.GetProperty("photoCount").GetInt32());
        Assert.Equal(1, maras.GetProperty("wrappedUp")[0].GetProperty("peopleCount").GetInt32());
        Assert.Equal(1, maras.GetProperty("wrappedUp")[0].GetProperty("photoCount").GetInt32());
        Assert.Equal(0, joels.GetProperty("active").GetArrayLength());
        Assert.Equal(["Lakeside Weekend"], Names(joels.GetProperty("wrappedUp")));
        Assert.Equal(0, sams.GetProperty("wrappedUp").GetArrayLength());
    }

    // Given a wrapped-up Popkin with no photo,
    // when its member reads My Popkins, then it counts 0 photos.
    [Fact]
    public async Task A_wrapped_up_Popkin_without_photos_counts_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var mine = await MyPopkinsAsync(lakeside.Host);

        Assert.Equal(0, mine.GetProperty("active").GetArrayLength());
        Assert.Equal(0, Assert.Single(mine.GetProperty("wrappedUp").EnumerateArray()).GetProperty("photoCount").GetInt32());
    }
}
