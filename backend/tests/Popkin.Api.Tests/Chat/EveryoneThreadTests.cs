using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>GET /api/popkins/{popkinId}/threads/everyone (L2-021 AC1, L2-045 AC1, L2-051).</summary>
public sealed class EveryoneThreadTests
{
    // Given a Popkin with its Host and one member,
    // when a member reads the Everyone thread,
    // then it carries the Popkin's look, its end, its counts and who is reading.
    [Fact]
    public async Task A_member_reads_the_Everyone_thread_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira")).Content.ReadFromJsonAsync<JsonElement>();

        var thread = await joel.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads/everyone");

        Assert.NotEqual(Guid.Empty, thread.GetProperty("id").GetGuid());
        Assert.Equal(lakeside.Id, thread.GetProperty("popkinId").GetGuid());
        Assert.Equal("Everyone", thread.GetProperty("kind").GetString());
        Assert.Equal("Lakeside Weekend", thread.GetProperty("popkinName").GetString());
        Assert.Equal("🏕️", thread.GetProperty("emoji").GetString());
        Assert.Equal("Teal", thread.GetProperty("colour").GetString());
        Assert.Equal(lakeside.EndsAt, thread.GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal(2, thread.GetProperty("memberCount").GetInt32());
        Assert.Equal(0, thread.GetProperty("hereNow").GetInt32());
        Assert.Equal(0, thread.GetProperty("presenceVersion").GetInt64());
        Assert.False(thread.GetProperty("readOnly").GetBoolean());
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), thread.GetProperty("viewer").GetProperty("membershipId").GetGuid());
        Assert.Equal("Joel", thread.GetProperty("viewer").GetProperty("firstName").GetString());
        Assert.Equal(
            ["colour", "emoji", "endsAt", "hereNow", "id", "kind", "lastReadMessageId", "memberCount", "popkinId", "popkinName", "presenceVersion", "readOnly", "unreadCount", "viewer"],
            thread.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given a Popkin that keeps going and has wrapped up,
    // when its Host reads the Everyone thread,
    // then it has no end and is read-only.
    [Fact]
    public async Task A_wrapped_up_Popkin_reads_as_read_only_and_one_that_keeps_going_has_no_end()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync("KeepItGoing");
        await api.WrapUpAsync(lakeside.Id);

        var thread = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads/everyone");

        Assert.True(thread.GetProperty("readOnly").GetBoolean());
        Assert.Equal(JsonValueKind.Null, thread.GetProperty("endsAt").ValueKind);
    }

    // Given a signed-in person who is not a member,
    // when they ask for the Everyone thread of a Popkin, or of one that does not exist,
    // then both answer 404 popkin_not_found, and no session answers 401.
    [Fact]
    public async Task Only_a_member_reads_the_thread()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/threads/everyone")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/threads/everyone")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/threads/everyone")).StatusCode);
    }
}
