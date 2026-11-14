using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>
/// PATCH /api/popkins/{popkinId}: the Host changes the Popkin's name, emoji and colour, under the
/// rules of L2-008, and every member hears it (L2-020 AC3, AC5).
/// </summary>
public sealed class EditPopkinLookTests
{
    private static readonly object CampfireNights = new { name = "Campfire Nights", emoji = "🎉", colour = "Plum" };

    // Given Lakeside Weekend, its Host and a member, each with the Popkin open,
    // when the Host saves a new name, emoji and colour,
    // then the answer and the home carry them, and both hear PopkinChanged with a higher version.
    [Fact]
    public async Task The_Host_changes_the_look_and_every_member_hears_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var before = (await lakeside.Host.HomeAsync(lakeside.Id)).GetProperty("version").GetInt64();
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var response = await lakeside.Host.PatchAsJsonAsync($"/api/popkins/{lakeside.Id}", CampfireNights);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        AssertLook(saved, "Campfire Nights", "🎉", "Plum");
        Assert.True(saved.GetProperty("version").GetInt64() > before);
        AssertLook(await joel.HomeAsync(lakeside.Id), "Campfire Nights", "🎉", "Plum");
        // The chat's header reads the Popkin too, with the version that orders the event.
        var thread = await joel.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/threads/everyone");
        Assert.Equal("Campfire Nights", thread.GetProperty("popkinName").GetString());
        Assert.Equal(saved.GetProperty("version").GetInt64(), thread.GetProperty("popkinVersion").GetInt64());
        foreach (var hub in new[] { maraHub, joelHub })
        {
            var changed = await hub.WaitForAsync("PopkinChanged");
            Assert.Equal(lakeside.Id, changed.Arguments[0].GetGuid());
            AssertLook(changed.Arguments[1], "Campfire Nights", "🎉", "Plum");
            Assert.Equal(saved.GetProperty("version").GetInt64(), changed.Arguments[1].GetProperty("version").GetInt64());
        }
    }

    // Given the Host, when they save an empty name, then 400 name_required and the name stays.
    [Fact]
    public async Task An_empty_name_is_refused_under_the_rules_of_a_new_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.PatchAsJsonAsync($"/api/popkins/{lakeside.Id}", new { name = "  ", emoji = "🎉", colour = "Plum" });

        await response.AssertProblem(HttpStatusCode.BadRequest, "name_required");
        AssertLook(await lakeside.Host.HomeAsync(lakeside.Id), "Lakeside Weekend", "🏕️", "Teal");
    }

    // Given a member who is not the Host, when they try to change the look, then 403 host_only.
    [Fact]
    public async Task A_member_who_is_not_the_Host_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");

        var response = await joel.PatchAsJsonAsync($"/api/popkins/{lakeside.Id}", CampfireNights);

        await response.AssertProblem(HttpStatusCode.Forbidden, "host_only");
        AssertLook(await joel.HomeAsync(lakeside.Id), "Lakeside Weekend", "🏕️", "Teal");
    }

    // Given someone who is not a member, when they try to change the look, then 404 popkin_not_found.
    [Fact]
    public async Task Someone_who_is_not_a_member_cannot_tell_the_Popkin_exists()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        var response = await sam.PatchAsJsonAsync($"/api/popkins/{lakeside.Id}", CampfireNights);

        await response.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }

    // Given a wrapped-up Popkin, when its Host tries to change the look, then 409 popkin_wrapped_up.
    [Fact]
    public async Task A_wrapped_up_Popkin_keeps_its_look()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.PatchAsJsonAsync($"/api/popkins/{lakeside.Id}", CampfireNights);

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    private static void AssertLook(JsonElement popkin, string name, string emoji, string colour)
    {
        Assert.Equal(name, popkin.GetProperty("name").GetString());
        Assert.Equal(emoji, popkin.GetProperty("emoji").GetString());
        Assert.Equal(colour, popkin.GetProperty("colour").GetString());
    }
}
