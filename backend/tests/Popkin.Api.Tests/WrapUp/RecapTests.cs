using System.Net;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>GET /api/popkins/{popkinId}/recap: the send-off of a wrapped-up Popkin (L2-046 AC1 to AC3, L2-051 AC1).</summary>
public sealed class RecapTests
{
    // Given Lakeside, started by Mara, with Joel, and Priya who left; three messages, five photos,
    // "Sunrise paddle" shared by Joel and rated 5 and 4, and "Bonfire" rated 4; wrapped up with its album kept,
    // when a member opens the recap,
    // then it names the Popkin and the dates it ran, counts the three who showed up, the messages
    // and the photos, shows the latest three photos and the avatars of those still in, Host first,
    // and names Sunrise paddle as the top-rated moment with its score and who shared it.
    [Fact]
    public async Task A_member_reads_the_recap_of_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var startedAt = api.Clock.GetUtcNow();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await api.JoinedAsync(lakeside.Code, "Priya N", "(415) 555-0155");
        await api.LeaveAsync(lakeside.Id, "Priya N");
        await api.AddMessagesAsync(lakeside.Id, 3, TimeSpan.FromMinutes(1));
        var photoIds = await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 5, TimeSpan.FromMinutes(1));
        var paddle = (await joel.SharedExperienceAsync(lakeside.Id, "Sunrise paddle")).Id();
        var bonfire = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Bonfire")).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, paddle, 5);
        await joel.RatedAsync(lakeside.Id, paddle, 4);
        await lakeside.Host.RatedAsync(lakeside.Id, bonfire, 4);
        var wrappedUpAt = (await lakeside.Host.WrappedUpAsync(lakeside.Id)).GetProperty("wrappedUpAt").GetDateTimeOffset();

        var recap = await joel.ReadRecapAsync(lakeside.Id);
        var hostRecap = await lakeside.Host.ReadRecapAsync(lakeside.Id);

        Assert.Equal(lakeside.Id, recap.GetProperty("id").GetGuid());
        Assert.Equal("Lakeside Weekend", recap.GetProperty("name").GetString());
        Assert.Equal("🏕️", recap.GetProperty("emoji").GetString());
        Assert.Equal("Teal", recap.GetProperty("colour").GetString());
        Assert.Equal(startedAt, recap.GetProperty("startedAt").GetDateTimeOffset());
        Assert.Equal(wrappedUpAt, recap.GetProperty("wrappedUpAt").GetDateTimeOffset());
        Assert.True(recap.GetProperty("keepPhotos").GetBoolean());
        Assert.Equal(JsonValueKind.Null, recap.GetProperty("photosRemoveAt").ValueKind);
        Assert.Equal(JsonValueKind.Null, recap.GetProperty("photosRemovedAt").ValueKind);
        Assert.False(recap.GetProperty("isHost").GetBoolean());
        Assert.True(hostRecap.GetProperty("isHost").GetBoolean());
        Assert.Equal(3, recap.GetProperty("peopleCount").GetInt32());
        Assert.Equal(3, recap.GetProperty("messageCount").GetInt32());
        Assert.Equal(5, recap.GetProperty("photoCount").GetInt32());

        var photos = recap.GetProperty("photos").EnumerateArray().ToList();
        Assert.Equal([photoIds[4], photoIds[3], photoIds[2]], photos.Select(p => p.GetProperty("id").GetGuid()));
        Assert.All(photos, p => Assert.StartsWith("/api/files/", p.GetProperty("thumbnailUrl").GetString()));
        Assert.Equal(["id", "thumbnailUrl"], photos[0].EnumerateObject().Select(p => p.Name).Order());

        var avatars = recap.GetProperty("avatars").EnumerateArray().ToList();
        Assert.Equal(["MO", "JF"], avatars.Select(a => a.GetProperty("initials").GetString()));
        Assert.Equal(["accent", "initials", "photoUrl"], avatars[0].EnumerateObject().Select(p => p.Name).Order());

        var top = recap.GetProperty("topRated");
        Assert.Equal(paddle, top.GetProperty("experienceId").GetGuid());
        Assert.Equal("Sunrise paddle", top.GetProperty("title").GetString());
        Assert.Equal(4.5, top.GetProperty("average").GetDouble());
        Assert.Equal(2, top.GetProperty("ratingCount").GetInt32());
        Assert.Equal("Joel", top.GetProperty("sharedBy").GetProperty("firstName").GetString());
        Assert.Equal(["firstName"], top.GetProperty("sharedBy").EnumerateObject().Select(p => p.Name));
        Assert.Equal(["average", "experienceId", "ratingCount", "sharedBy", "title"], top.EnumerateObject().Select(p => p.Name).Order());

        Assert.Equal(
            [
                "avatars", "colour", "emoji", "id", "isHost", "keepPhotos", "messageCount", "name", "peopleCount", "photoCount", "photos",
                "photosRemoveAt", "photosRemovedAt", "startedAt", "topRated", "wrappedUpAt",
            ],
            recap.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given a Popkin of six members where nothing was rated, no photo was added and nobody wrote,
    // when its recap is read, then there is no top-rated moment, no photo, nothing counted but
    // the people, and at most four avatars (L2-046 AC3).
    [Fact]
    public async Task A_quiet_Popkin_has_a_recap_without_a_top_rated_moment()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Joel F", "Priya N", "Dev S", "Ana L", "Tom W");
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Bonfire");
        await lakeside.Host.WrappedUpAsync(lakeside.Id, keepPhotos: false);

        var recap = await lakeside.Host.ReadRecapAsync(lakeside.Id);

        Assert.Equal(JsonValueKind.Null, recap.GetProperty("topRated").ValueKind);
        Assert.Equal(0, recap.GetProperty("photos").GetArrayLength());
        Assert.Equal(6, recap.GetProperty("peopleCount").GetInt32());
        Assert.Equal(0, recap.GetProperty("messageCount").GetInt32());
        Assert.Equal(0, recap.GetProperty("photoCount").GetInt32());
        Assert.Equal(["MO", "JF", "PN", "DS"], recap.GetProperty("avatars").EnumerateArray().Select(a => a.GetProperty("initials").GetString()));
        Assert.False(recap.GetProperty("keepPhotos").GetBoolean());
        Assert.Equal(
            recap.GetProperty("wrappedUpAt").GetDateTimeOffset().AddDays(30), recap.GetProperty("photosRemoveAt").GetDateTimeOffset());
    }

    // Given a message its author deleted, when the recap counts the messages sent, then it is not one of them.
    [Fact]
    public async Task A_deleted_message_is_not_counted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Who has the cabin keys?");
        var gone = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Never mind.", gone);
        (await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/messages/client/{gone}")).EnsureSuccessStatusCode();
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        var recap = await lakeside.Host.ReadRecapAsync(lakeside.Id);

        Assert.Equal(1, recap.GetProperty("messageCount").GetInt32());
    }

    // Given an active Popkin, when a member asks for its recap, then 409 popkin_active;
    // given someone who is not a member, then 404 popkin_not_found, wrapped up or not (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_reads_the_recap_and_only_once_the_Popkin_has_wrapped_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await lakeside.Host.RecapAsync(lakeside.Id)).AssertProblem(HttpStatusCode.Conflict, "popkin_active");
        await (await sam.RecapAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        await (await sam.RecapAsync(lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/recap")).StatusCode);
    }
}
