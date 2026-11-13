using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>GET /api/popkins/{popkinId}, the header of the Popkin home (L2-019 AC1, AC7, L2-051 AC1).</summary>
public sealed class PopkinHomeTests
{
    private static Task<JsonElement> HomeAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}");

    // Given Lakeside Weekend with its Host and one member,
    // when the member opens the Popkin home,
    // then the header carries the Popkin's look, its end, its members and who is reading.
    [Fact]
    public async Task A_member_reads_the_header_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira")).Content.ReadFromJsonAsync<JsonElement>();

        var home = await HomeAsync(joel, lakeside.Id);
        var hostHome = await HomeAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(lakeside.Id, home.GetProperty("id").GetGuid());
        Assert.Equal("Lakeside Weekend", home.GetProperty("name").GetString());
        Assert.Equal("🏕️", home.GetProperty("emoji").GetString());
        Assert.Equal("Teal", home.GetProperty("colour").GetString());
        Assert.Equal("Active", home.GetProperty("status").GetString());
        Assert.Equal(lakeside.EndsAt, home.GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal(2, home.GetProperty("memberCount").GetInt32());
        Assert.Equal(["MO", "JF"], home.GetProperty("avatars").EnumerateArray().Select(a => a.GetProperty("initials").GetString()));
        Assert.Equal(["accent", "initials", "photoUrl"], home.GetProperty("avatars")[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Member", home.GetProperty("viewerRole").GetString());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), home.GetProperty("viewer").GetProperty("membershipId").GetGuid());
        Assert.Equal("Joel", home.GetProperty("viewer").GetProperty("firstName").GetString());
        Assert.Equal(["firstName", "membershipId"], home.GetProperty("viewer").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(0, home.GetProperty("unreadCount").GetInt32());
        Assert.Equal(
            [
                "avatars", "colour", "emoji", "endsAt", "id", "keepPhotos", "memberCount", "name", "photosRemoveAt", "photosRemovedAt",
                "status", "unreadCount", "viewer", "viewerRole", "wrappedUpAt",
            ],
            home.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Host", hostHome.GetProperty("viewerRole").GetString());
        Assert.Equal("Mara", hostHome.GetProperty("viewer").GetProperty("firstName").GetString());
    }

    // Given a Popkin of six, the Host having started it,
    // when a member opens the home,
    // then it counts all six and shows four avatars: the Host first, then in the order they joined.
    [Fact]
    public async Task The_header_shows_at_most_four_avatars_with_the_Host_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Joel Ferreira", "Priya Nair", "Tomas Lindqvist", "Dana Whitfield", "Sam Ortega");

        var home = await HomeAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(6, home.GetProperty("memberCount").GetInt32());
        Assert.Equal(["MO", "JF", "PN", "TL"], home.GetProperty("avatars").EnumerateArray().Select(a => a.GetProperty("initials").GetString()));
    }

    // Given messages by the Host that a member has not read,
    // when the member opens the home, then its unread count is the Everyone thread's;
    // when they mark the thread read, then both are 0.
    [Fact]
    public async Task The_unread_count_is_the_Everyone_threads_and_follows_the_read_point()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Morning all");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        var latest = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Coffee is on");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await joel.SentMessageAsync(lakeside.Id, threadId, "Morning!");

        var before = await HomeAsync(joel, lakeside.Id);
        var threadBefore = await joel.EveryoneThreadAsync(lakeside.Id);
        await joel.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/read", new { lastReadMessageId = latest.GetProperty("id").GetGuid() });
        var after = await HomeAsync(joel, lakeside.Id);

        Assert.Equal(2, before.GetProperty("unreadCount").GetInt32());
        Assert.Equal(threadBefore.GetProperty("unreadCount").GetInt32(), before.GetProperty("unreadCount").GetInt32());
        Assert.Equal(0, after.GetProperty("unreadCount").GetInt32());
    }

    // Given a Popkin that keeps going and has wrapped up,
    // when its Host opens the home,
    // then it still reads, with no end and the status WrappedUp.
    [Fact]
    public async Task A_wrapped_up_Popkin_still_reads_and_one_that_keeps_going_has_no_end()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        await api.WrapUpAsync(lakeside.Id);

        var home = await HomeAsync(lakeside.Host, lakeside.Id);

        Assert.Equal("WrappedUp", home.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, home.GetProperty("endsAt").ValueKind);
    }

    // Given an active Popkin, when a member opens the home,
    // then it has not wrapped up, its album is kept and no date is set for its photos (L2-045).
    [Fact]
    public async Task An_active_Popkin_has_not_wrapped_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var home = await HomeAsync(lakeside.Host, lakeside.Id);

        Assert.Equal("Active", home.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, home.GetProperty("wrappedUpAt").ValueKind);
        Assert.True(home.GetProperty("keepPhotos").GetBoolean());
        Assert.Equal(JsonValueKind.Null, home.GetProperty("photosRemoveAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, home.GetProperty("photosRemovedAt").ValueKind);
    }

    // Given a Popkin its Host wrapped up without keeping the album, when a member opens the home,
    // then it says when it wrapped up and that its photos go 30 days later (L2-045 AC4).
    [Fact]
    public async Task A_Popkin_wrapped_up_without_its_album_says_when_the_photos_go()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var wrappedUpAt = api.Clock.GetUtcNow();
        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: false);
        api.Clock.Advance(TimeSpan.FromDays(2));

        var home = await HomeAsync(joel, lakeside.Id);

        Assert.Equal("WrappedUp", home.GetProperty("status").GetString());
        Assert.Equal(wrappedUpAt, home.GetProperty("wrappedUpAt").GetDateTimeOffset());
        Assert.False(home.GetProperty("keepPhotos").GetBoolean());
        Assert.Equal(wrappedUpAt.AddDays(30), home.GetProperty("photosRemoveAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, home.GetProperty("photosRemovedAt").ValueKind);
    }

    // Given a signed-in person who is not a member,
    // when they ask for the home of a Popkin, or of one that does not exist,
    // then both answer 404 popkin_not_found, and no session answers 401.
    [Fact]
    public async Task Only_a_member_reads_the_header()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}")).StatusCode);
    }
}
