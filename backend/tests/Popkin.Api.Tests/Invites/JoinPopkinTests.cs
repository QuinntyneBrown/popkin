using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Invites;

/// <summary>POST /api/invites/{code}/join and GET /api/invites/{code}/members (L2-013, L2-014 AC1, L2-045 AC2, L2-051).</summary>
public sealed class JoinPopkinTests
{
    private static async Task<HttpClient> SignedUp(ApiFactory api, string name, string phone)
    {
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, name, phone);
        return client;
    }

    [Fact]
    public async Task Without_a_session_nobody_joins()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await api.CreateBrowserClient().JoinAsync(lakeside.Code, "Joel");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_person_joins_as_a_member_under_the_name_they_give()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel Ferreira", "(415) 555-0123");
        api.Clock.Advance(TimeSpan.FromMinutes(5));

        var response = await joel.JoinAsync(lakeside.Code, "  Joel ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(lakeside.Id, body.GetProperty("popkinId").GetGuid());
        Assert.Equal("Joel", body.GetProperty("displayName").GetString());
        Assert.Equal("Lakeside Weekend", body.GetProperty("popkinName").GetString());
        Assert.Equal("🏕️", body.GetProperty("emoji").GetString());
        Assert.Equal("Teal", body.GetProperty("colour").GetString());
        Assert.Equal(["Mara"], body.GetProperty("namedMembers").EnumerateArray().Select(n => n.GetString()));
        Assert.Equal(0, body.GetProperty("othersCount").GetInt32());

        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var membership = db.Memberships.Single(m => m.Id == body.GetProperty("membershipId").GetGuid());
        Assert.Equal(Domain.MembershipRole.Member, membership.Role);
        Assert.Equal("Joel", membership.DisplayName);
        Assert.Equal(api.Clock.GetUtcNow(), membership.JoinedAt);
        Assert.Equal(db.Memberships.Single(m => m.Role == Domain.MembershipRole.Host).Id, membership.InvitedByMembershipId);
    }

    [Fact]
    public async Task The_welcome_names_two_members_the_Host_first_and_counts_the_rest()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await (await SignedUp(api, "Walt Brennan", "(415) 555-0101")).JoinAsync(lakeside.Code, "Walt Brennan");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await (await SignedUp(api, "Dev Patel", "(415) 555-0102")).JoinAsync(lakeside.Code, "Dev Patel");
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        await (await SignedUp(api, "Ellie Brennan", "(415) 555-0103")).JoinAsync(lakeside.Code, "Ellie");
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        var body = await (await joel.JoinAsync(lakeside.Code, "Joel")).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(["Mara", "Walt"], body.GetProperty("namedMembers").EnumerateArray().Select(n => n.GetString()));
        Assert.Equal(2, body.GetProperty("othersCount").GetInt32());
    }

    [Theory]
    [InlineData("   ", "display_name_required")]
    [InlineData("Joel of the Lakeside Brennan–Okafor Reunion", "display_name_too_long")]
    public async Task A_name_that_breaks_its_rule_is_refused(string name, string code)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        var response = await joel.JoinAsync(lakeside.Code, name);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal("displayName", body.GetProperty("field").GetString());
        Assert.Equal(1, api.MembershipCount());
    }

    [Fact]
    public async Task Joining_again_returns_the_membership_and_adds_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");
        var first = await (await joel.JoinAsync(lakeside.Code, "Joel")).Content.ReadFromJsonAsync<JsonElement>();

        var again = await joel.JoinAsync(lakeside.Code, "Joel F");

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var body = await again.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(first.GetProperty("membershipId").GetGuid(), body.GetProperty("membershipId").GetGuid());
        Assert.Equal("Joel", body.GetProperty("displayName").GetString());
        Assert.Equal(2, api.MembershipCount());
    }

    [Fact]
    public async Task A_code_that_matches_no_Popkin_is_not_found()
    {
        using var api = new ApiFactory();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        var response = await joel.JoinAsync("nosuchcode", "Joel");

        await response.AssertProblem(HttpStatusCode.NotFound, "invite_not_found");
    }

    [Fact]
    public async Task Nobody_joins_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        var response = await joel.JoinAsync(lakeside.Code, "Joel");

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(1, api.MembershipCount());
    }

    [Fact]
    public async Task When_the_save_fails_nobody_was_added()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");
        api.Faults.FailSaves = true;

        var response = await joel.JoinAsync(lakeside.Code, "Joel");

        await response.AssertProblem(HttpStatusCode.InternalServerError, "server_error");
        api.Faults.FailSaves = false;
        Assert.Equal(1, api.MembershipCount());
    }

    [Fact]
    public async Task Membership_opens_the_Popkin_to_the_new_member()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");
        await (await joel.GetAsync($"/api/popkins/{lakeside.Id}/invite")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");

        await joel.JoinAsync(lakeside.Code, "Joel");

        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync($"/api/popkins/{lakeside.Id}/invite")).StatusCode);
        var preview = await joel.GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");
        Assert.True(preview.GetProperty("viewer").GetProperty("isMember").GetBoolean());
    }

    [Fact]
    public async Task The_preview_counts_every_member_and_shows_five_avatars_the_Host_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        string[] names = ["Walt Brennan", "Dev Patel", "Ellie Brennan", "Ruth Lindqvist", "Sam Ortega", "Grace Adeyemi"];
        for (var i = 0; i < names.Length; i++)
        {
            api.Clock.Advance(TimeSpan.FromMinutes(1));
            await (await SignedUp(api, names[i], $"(415) 555-02{i:00}")).JoinAsync(lakeside.Code, names[i]);
        }

        var body = await api.CreateBrowserClient().GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");

        Assert.Equal(7, body.GetProperty("memberCount").GetInt32());
        Assert.Equal(
            ["MO", "WB", "DP", "EB", "RL"],
            body.GetProperty("avatars").EnumerateArray().Select(a => a.GetProperty("initials").GetString()));
    }

    [Fact]
    public async Task A_signed_in_person_with_the_code_sees_who_is_already_in()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(
            lakeside.Id,
            "Walt Brennan", "Dev Patel", "Ellie Brennan", "Ruth Lindqvist", "Sam Ortega", "Grace Adeyemi", "Priya Nair", "Noor Haddad", "Tomás Silva");
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        var text = await joel.GetStringAsync($"/api/invites/{lakeside.Code}/members");

        var body = JsonDocument.Parse(text).RootElement;
        var members = body.GetProperty("members").EnumerateArray().ToList();
        Assert.Equal(
            ["Mara Okafor", "Walt Brennan", "Dev Patel", "Ellie Brennan", "Ruth Lindqvist", "Sam Ortega", "Grace Adeyemi", "Priya Nair"],
            members.Select(m => m.GetProperty("displayName").GetString()));
        Assert.Equal("MO", members[0].GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(2, body.GetProperty("othersCount").GetInt32());
        // Names and avatars only: no contact detail and no id (L2-054 AC2).
        Assert.All(members, m => Assert.Equal(["avatar", "displayName"], m.EnumerateObject().Select(p => p.Name).Order()));
        Assert.DoesNotContain("555", text);
    }

    [Fact]
    public async Task Who_is_already_in_needs_a_session_a_real_code_and_an_active_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await SignedUp(api, "Joel", "(415) 555-0123");

        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/invites/{lakeside.Code}/members")).StatusCode);
        await (await joel.GetAsync("/api/invites/nosuchcode/members")).AssertProblem(HttpStatusCode.NotFound, "invite_not_found");
        await api.WrapUpAsync(lakeside.Id);
        await (await joel.GetAsync($"/api/invites/{lakeside.Code}/members")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }
}
