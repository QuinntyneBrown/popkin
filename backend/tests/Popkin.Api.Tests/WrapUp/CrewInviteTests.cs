using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Domain;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// POST /api/popkins/{popkinId}/crew-invites: "Pop up another with this crew" sends the new
/// Popkin's invite to every member of the old one (L2-046 AC5, L2-051 AC4).
/// </summary>
public sealed class CrewInviteTests
{
    private sealed record NewPopkin(Guid Id, string InviteUrl);

    private static async Task<NewPopkin> StartAsync(HttpClient host, string name)
    {
        var response = await host.PostAsJsonAsync("/api/popkins", new { name, emoji = "🏕️", colour = "Teal", length = "KeepItGoing" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new NewPopkin(body.GetProperty("id").GetGuid(), body.GetProperty("inviteUrl").GetString()!);
    }

    private static Task<HttpResponseMessage> InviteCrewAsync(HttpClient host, Guid popkinId, Guid? fromPopkinId) =>
        host.PostAsJsonAsync($"/api/popkins/{popkinId}/crew-invites", new { fromPopkinId });

    /// <summary>The contact detail a member signs in with, read from the store.</summary>
    private static string ContactOf(ApiFactory api, Guid popkinId, string displayName)
    {
        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var personId = db.Memberships.Single(m => m.PopkinId == popkinId && m.DisplayName == displayName).PersonId;
        var person = db.People.Single(p => p.Id == personId);
        return person.Phone ?? person.Email!;
    }

    // Given Lakeside, wrapped up, with Joel, who signs in with a phone number, Dev, who signs in with an email,
    // Priya, who left, and Ana, who is already in the new Popkin,
    // when Mara, its Host, starts Lakeside Again and invites the crew,
    // then 202, and Joel and Dev are each sent the new Popkin's invite link where they sign in;
    // Mara, Priya and Ana are sent nothing; and asking again sends nothing more.
    [Fact]
    public async Task The_Host_sends_the_new_Popkins_invite_to_the_crew_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await api.JoinedAsync(lakeside.Code, "Priya N", "(415) 555-0155");
        var ana = await api.JoinedAsync(lakeside.Code, "Ana L", "(415) 555-0166");
        await api.AddMembersAsync(lakeside.Id, "Dev S");
        await api.LeaveAsync(lakeside.Id, "Priya N");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        var again = await StartAsync(lakeside.Host, "Lakeside Again");
        (await ana.JoinAsync(again.InviteUrl.Split('/').Last(), "Ana L")).EnsureSuccessStatusCode();

        var response = await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id);
        var repeated = await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, repeated.StatusCode);
        var sent = api.CrewInvites.Sent.OrderBy(s => s.Channel).ToList();
        Assert.Equal(2, sent.Count);
        Assert.Equal((ContactChannel.Phone, ContactOf(api, lakeside.Id, "Joel F")), (sent[0].Channel, sent[0].Destination));
        Assert.Equal((ContactChannel.Email, ContactOf(api, lakeside.Id, "Dev S")), (sent[1].Channel, sent[1].Destination));
        Assert.All(sent, s =>
        {
            Assert.Equal(again.InviteUrl, s.Invite.Link);
            Assert.Equal("Lakeside Again", s.Invite.PopkinName);
            Assert.Equal("Mara", s.Invite.HostFirstName);
        });
    }

    // Given the provider cannot deliver, when the Host invites the crew, then 202 all the same;
    // and when it can again and the Host asks again, then those who got nothing are sent the invite.
    [Fact]
    public async Task An_invite_that_could_not_be_sent_is_sent_when_the_Host_asks_again()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        var again = await StartAsync(lakeside.Host, "Lakeside Again");
        api.CrewInvites.Fail = true;

        var failed = await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id);
        api.CrewInvites.Fail = false;
        var sentNow = await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id);

        Assert.Equal(HttpStatusCode.Accepted, failed.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, sentNow.StatusCode);
        Assert.Single(api.CrewInvites.Sent);
    }

    // Given the caller is not the Host of both Popkins, then 403 host_only, or 404 popkin_not_found
    // where they are not a member; given the old Popkin has not wrapped up, 409 popkin_active;
    // given no old Popkin is named, 400 validation_failed. Nobody is sent anything.
    [Fact]
    public async Task Only_the_Host_of_both_Popkins_invites_the_crew_of_a_wrapped_up_one()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var again = await StartAsync(lakeside.Host, "Lakeside Again");
        var joels = await StartAsync(joel, "Joel's Own");
        var sams = await StartAsync(sam, "Book Club");

        // The old Popkin is still active.
        await (await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id)).AssertProblem(HttpStatusCode.Conflict, "popkin_active");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        // Joel hosts the new Popkin and is a member, not the Host, of the old one.
        await (await InviteCrewAsync(joel, joels.Id, lakeside.Id)).AssertProblem(HttpStatusCode.Forbidden, "host_only");
        // Sam hosts the new Popkin and is not in the old one.
        await (await InviteCrewAsync(sam, sams.Id, lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        // Joel is not in Mara's new Popkin.
        await (await InviteCrewAsync(joel, again.Id, lakeside.Id)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        // Joel joins it: a member of it, not its Host.
        (await joel.JoinAsync(again.InviteUrl.Split('/').Last(), "Joel F")).EnsureSuccessStatusCode();
        await (await InviteCrewAsync(joel, again.Id, lakeside.Id)).AssertProblem(HttpStatusCode.Forbidden, "host_only");
        // The Host names no old Popkin, or one that does not exist.
        var unnamed = await (await InviteCrewAsync(lakeside.Host, again.Id, null)).AssertProblem(HttpStatusCode.BadRequest, "validation_failed");
        Assert.Equal("fromPopkinId", unnamed.GetProperty("field").GetString());
        await (await InviteCrewAsync(lakeside.Host, again.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        // The new Popkin has wrapped up itself.
        await lakeside.Host.WrappedUpAsync(again.Id);
        await (await InviteCrewAsync(lakeside.Host, again.Id, lakeside.Id)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");

        Assert.Empty(api.CrewInvites.Sent);
    }
}
