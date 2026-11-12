using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Popkins;

/// <summary>POST /api/popkins and GET /api/popkins/{id}/invite (L2-008, L2-009, L2-010 AC6, L2-011 AC5, L2-051).</summary>
public sealed class CreatePopkinTests
{
    private static object Lakeside(ApiFactory api, string length = "TheWeekend", DateTimeOffset? endsAt = null, string name = "Lakeside Weekend", string emoji = "🏕️", string colour = "Teal") =>
        new { name, emoji, colour, length, endsAt = length == "KeepItGoing" ? (DateTimeOffset?)null : endsAt ?? api.Clock.GetUtcNow().AddDays(1) };

    private static async Task<(ApiFactory Api, HttpClient Client)> SignedIn()
    {
        var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        return (api, client);
    }

    [Fact]
    public async Task Without_a_session_nothing_is_created()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().PostAsJsonAsync("/api/popkins", Lakeside(api));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_Popkin_is_created_with_its_invite_and_its_creator_as_Host_and_first_member()
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", Lakeside(api));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();
        Assert.Equal($"/api/popkins/{id}", response.Headers.Location?.ToString());
        Assert.Equal("Lakeside Weekend", body.GetProperty("name").GetString());
        Assert.Equal("🏕️", body.GetProperty("emoji").GetString());
        Assert.Equal("Teal", body.GetProperty("colour").GetString());
        var code = body.GetProperty("inviteCode").GetString()!;
        Assert.Equal(10, code.Length);
        Assert.All(code, c => Assert.Contains(c, "abcdefghjkmnpqrstuvwxyz23456789"));
        Assert.Equal($"https://popk.in/{code}", body.GetProperty("inviteUrl").GetString());

        using var scope = api.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var popkin = db.Popkins.Single();
        var membership = db.Memberships.Single();
        Assert.Equal(popkin.HostPersonId, membership.PersonId);
        Assert.Equal(Domain.MembershipRole.Host, membership.Role);
        Assert.Equal("Mara", membership.DisplayName);
        Assert.Equal(Domain.ChatThreadKind.Everyone, db.ChatThreads.Single(t => t.PopkinId == popkin.Id).Kind);
    }

    [Fact]
    public async Task The_name_is_trimmed_and_Keep_it_going_has_no_end()
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", Lakeside(api, "KeepItGoing", name: "  Thursday Night Crew "));

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Thursday Night Crew", body.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("endsAt").ValueKind);
    }

    [Fact]
    public async Task Every_invite_code_is_different()
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var codes = new HashSet<string>();
        for (var i = 0; i < 5; i++)
        {
            var body = await (await client.PostAsJsonAsync("/api/popkins", Lakeside(api))).Content.ReadFromJsonAsync<JsonElement>();
            codes.Add(body.GetProperty("inviteCode").GetString()!);
        }

        Assert.Equal(5, codes.Count);
    }

    [Theory]
    [InlineData("   ", "🏕️", "Teal", "name_required", "name")]
    [InlineData("The Brennan–Okafor Lakeside Reunion 2026!", "🏕️", "Teal", "name_too_long", "name")]
    [InlineData("Lakeside Weekend", "🦖", "Teal", "emoji_not_allowed", "emoji")]
    [InlineData("Lakeside Weekend", "🏕️", "Mauve", "colour_not_allowed", "colour")]
    public async Task A_field_that_breaks_its_rule_is_refused(string name, string emoji, string colour, string code, string field)
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", Lakeside(api, name: name, emoji: emoji, colour: colour));

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, body.GetProperty("field").GetString());
    }

    [Fact]
    public async Task An_unknown_length_is_refused()
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", Lakeside(api, "Forever"));

        await response.AssertProblem(HttpStatusCode.BadRequest, "length_not_allowed");
    }

    [Theory]
    [InlineData("UntilDate", 30)]
    [InlineData("UntilDate", 60 * 24 * 367)]
    [InlineData("TheWeekend", -5)]
    public async Task An_end_out_of_range_is_refused(string length, int minutesAhead)
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", Lakeside(api, length, api.Clock.GetUtcNow().AddMinutes(minutesAhead)));

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "ends_at_out_of_range");
        Assert.Equal("endsAt", body.GetProperty("field").GetString());
    }

    [Fact]
    public async Task Keep_it_going_with_an_end_is_refused()
    {
        var (api, client) = await SignedIn();
        using var _ = api;

        var response = await client.PostAsJsonAsync("/api/popkins", new { name = "Lakeside Weekend", emoji = "🏕️", colour = "Teal", length = "KeepItGoing", endsAt = api.Clock.GetUtcNow().AddDays(1) });

        await response.AssertProblem(HttpStatusCode.BadRequest, "ends_at_out_of_range");
    }

    [Fact]
    public async Task A_member_reads_the_invite()
    {
        var (api, client) = await SignedIn();
        using var _ = api;
        var created = await (await client.PostAsJsonAsync("/api/popkins", Lakeside(api))).Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var invite = await client.GetFromJsonAsync<JsonElement>($"/api/popkins/{id}/invite");

        Assert.Equal(created.GetProperty("inviteCode").GetString(), invite.GetProperty("code").GetString());
        Assert.Equal(created.GetProperty("inviteUrl").GetString(), invite.GetProperty("url").GetString());
        Assert.Equal("Lakeside Weekend", invite.GetProperty("popkinName").GetString());
        Assert.Equal("🏕️", invite.GetProperty("emoji").GetString());
        Assert.Equal("Teal", invite.GetProperty("colour").GetString());
    }

    [Fact]
    public async Task Someone_who_is_not_a_member_cannot_tell_the_Popkin_exists()
    {
        var (api, client) = await SignedIn();
        using var _ = api;
        var created = await (await client.PostAsJsonAsync("/api/popkins", Lakeside(api))).Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();
        var other = api.CreateBrowserClient();
        await other.SignUpAsync(api, "Walt", "(415) 555-0177");

        var response = await other.GetAsync($"/api/popkins/{id}/invite");
        var missing = await other.GetAsync($"/api/popkins/{Guid.NewGuid()}/invite");

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await missing.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
