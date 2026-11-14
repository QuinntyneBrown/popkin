using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Chat;

/// <summary>PUT /api/popkins/{popkinId}/threads/direct/{memberId} (L2-023 AC1, AC4, AC5, L2-051, L2-054 AC2).</summary>
public sealed class OpenDirectThreadTests
{
    private static int DirectThreadCount(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().ChatThreads.Count(t => t.Kind == ChatThreadKind.Direct);
    }

    // Given two members of one Popkin with no direct message between them,
    // when one opens the direct message with the other,
    // then 201 answers a thread of kind Direct with two members, the Popkin's look and the
    // other member by name and avatar, and no contact detail.
    [Fact]
    public async Task A_member_opens_a_direct_message_with_another_member()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt Brennan");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var waltId = await walt.MembershipIdAsync(lakeside.Id);

        var response = await lakeside.Host.OpenDirectAsync(lakeside.Id, waltId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var thread = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(
            ["colour", "emoji", "endsAt", "hereNow", "id", "kind", "lastReadMessageId", "memberCount", "other", "popkinId", "popkinName", "popkinVersion", "presenceVersion", "readOnly", "unreadCount", "viewer"],
            thread.EnumerateObject().Select(p => p.Name).Order());
        Assert.NotEqual(await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id), thread.GetProperty("id").GetGuid());
        Assert.Equal(lakeside.Id, thread.GetProperty("popkinId").GetGuid());
        Assert.Equal("Direct", thread.GetProperty("kind").GetString());
        Assert.Equal("Lakeside Weekend", thread.GetProperty("popkinName").GetString());
        Assert.Equal("🏕️", thread.GetProperty("emoji").GetString());
        Assert.Equal("Teal", thread.GetProperty("colour").GetString());
        Assert.Equal(lakeside.EndsAt, thread.GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal(2, thread.GetProperty("memberCount").GetInt32());
        Assert.False(thread.GetProperty("readOnly").GetBoolean());
        Assert.Equal(0, thread.GetProperty("unreadCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, thread.GetProperty("lastReadMessageId").ValueKind);
        Assert.Equal(maraId, thread.GetProperty("viewer").GetProperty("membershipId").GetGuid());
        Assert.Equal("Mara", thread.GetProperty("viewer").GetProperty("firstName").GetString());
        var other = thread.GetProperty("other");
        Assert.Equal(["avatar", "displayName", "firstName", "membershipId"], other.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(waltId, other.GetProperty("membershipId").GetGuid());
        Assert.Equal("Walt Brennan", other.GetProperty("displayName").GetString());
        Assert.Equal("Walt", other.GetProperty("firstName").GetString());
        Assert.Equal(["accent", "initials", "photoUrl"], other.GetProperty("avatar").EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("WB", other.GetProperty("avatar").GetProperty("initials").GetString());
        // Never a phone number or an email (L2-054 AC2).
        // Matched on what a GUID never holds, so a random id cannot fail it.
        Assert.DoesNotContain("(415)", thread.GetRawText());
        Assert.DoesNotContain("+1415", thread.GetRawText());
    }

    // Given a direct message between two members,
    // when either opens it again, from either side,
    // then 200 answers the same thread, each with the other member, and no second thread is stored.
    [Fact]
    public async Task Two_members_have_one_direct_message_whoever_opens_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        var opened = await lakeside.Host.DirectThreadAsync(lakeside.Id, waltId);

        var again = await lakeside.Host.OpenDirectAsync(lakeside.Id, waltId);
        var fromWalt = await walt.OpenDirectAsync(lakeside.Id, maraId);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(HttpStatusCode.OK, fromWalt.StatusCode);
        var waltsThread = await fromWalt.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(opened.GetProperty("id").GetGuid(), (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());
        Assert.Equal(opened.GetProperty("id").GetGuid(), waltsThread.GetProperty("id").GetGuid());
        Assert.Equal(maraId, waltsThread.GetProperty("other").GetProperty("membershipId").GetGuid());
        Assert.Equal("Mara Okafor", waltsThread.GetProperty("other").GetProperty("displayName").GetString());
        Assert.Equal(waltId, waltsThread.GetProperty("viewer").GetProperty("membershipId").GetGuid());
        Assert.Equal(1, DirectThreadCount(api));
    }

    // Given two members who open the direct message between them at the same moment,
    // when the second loses on the unique index,
    // then it answers the winner's thread with 200 and one thread is stored.
    [Fact]
    public async Task Two_opens_at_the_same_moment_make_one_thread()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        Guid winnerId = default;
        api.Faults.LoseNextSaveTo = async () =>
        {
            using var scope = api.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var winner = ChatThread.Direct(lakeside.Id, waltId, maraId, api.Clock.GetUtcNow());
            winnerId = winner.Id;
            db.ChatThreads.Add(winner);
            await db.SaveChangesAsync();
        };

        var response = await lakeside.Host.OpenDirectAsync(lakeside.Id, waltId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(winnerId, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid());
        Assert.Equal(1, DirectThreadCount(api));
    }

    // A direct message is between two members of one Popkin (L2-023 AC4, L2-051): oneself is
    // 400 cannot_message_self; a member of another Popkin only, a member who has left and a
    // membership that does not exist are 404 member_not_found; a person who is not a member of
    // the Popkin gets 404 popkin_not_found, and no session 401. None of them stores a thread.
    [Fact]
    public async Task A_direct_message_is_only_between_two_members_of_one_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var maraId = await lakeside.Host.MembershipIdAsync(lakeside.Id);
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var samId = await sam.MembershipIdAsync(bookClubId);

        await (await lakeside.Host.OpenDirectAsync(lakeside.Id, maraId)).AssertProblem(HttpStatusCode.BadRequest, "cannot_message_self");
        // Sam and Mara share no Popkin, from either side.
        await (await lakeside.Host.OpenDirectAsync(lakeside.Id, samId)).AssertProblem(HttpStatusCode.NotFound, "member_not_found");
        await (await sam.OpenDirectAsync(bookClubId, maraId)).AssertProblem(HttpStatusCode.NotFound, "member_not_found");
        await (await sam.OpenDirectAsync(lakeside.Id, maraId)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.OpenDirectAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "member_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().OpenDirectAsync(lakeside.Id, maraId)).StatusCode);
        // Walt has left: Lakeside is no longer a Popkin the two share.
        await api.LeaveAsync(lakeside.Id, "Walt");
        await (await lakeside.Host.OpenDirectAsync(lakeside.Id, waltId)).AssertProblem(HttpStatusCode.NotFound, "member_not_found");

        Assert.Equal(0, DirectThreadCount(api));
    }

    // Given a Popkin that has wrapped up,
    // when a member opens a direct message that exists, then 200 answers it read-only;
    // when they open one that does not, then 409 popkin_wrapped_up and none is stored (L2-023 AC5, L2-045).
    [Fact]
    public async Task A_wrapped_up_Popkin_keeps_its_direct_messages_read_only_and_starts_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = await api.SignedUpAsync("Walt Brennan", "(415) 555-0191");
        await walt.JoinAsync(lakeside.Code, "Walt");
        var ruth = await api.SignedUpAsync("Ruth Lindqvist", "(415) 555-0166");
        await ruth.JoinAsync(lakeside.Code, "Ruth");
        var waltId = await walt.MembershipIdAsync(lakeside.Id);
        var ruthId = await ruth.MembershipIdAsync(lakeside.Id);
        var opened = await lakeside.Host.DirectThreadAsync(lakeside.Id, waltId);
        await api.WrapUpAsync(lakeside.Id);

        var existing = await lakeside.Host.OpenDirectAsync(lakeside.Id, waltId);
        var none = await lakeside.Host.OpenDirectAsync(lakeside.Id, ruthId);

        Assert.Equal(HttpStatusCode.OK, existing.StatusCode);
        var thread = await existing.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(opened.GetProperty("id").GetGuid(), thread.GetProperty("id").GetGuid());
        Assert.True(thread.GetProperty("readOnly").GetBoolean());
        await none.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(1, DirectThreadCount(api));
    }

    // The Everyone thread names no other member: `other` is null.
    [Fact]
    public async Task The_Everyone_thread_has_no_other_member()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var thread = await lakeside.Host.EveryoneThreadAsync(lakeside.Id);

        Assert.Equal(JsonValueKind.Null, thread.GetProperty("other").ValueKind);
    }
}
