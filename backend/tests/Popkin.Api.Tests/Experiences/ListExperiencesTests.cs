using System.Net;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>GET /api/popkins/{popkinId}/experiences: the experiences of a Popkin as cards (L2-037, L2-051 AC1).</summary>
public sealed class ListExperiencesTests
{
    // Given a Popkin where Mara shared a canoe trip with a picture and, later, Joel a restaurant,
    // when a member opens Experiences,
    // then the cards are the newest first, each as it was answered when it was shared.
    [Fact]
    public async Task Experiences_are_listed_newest_first()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var canoe = await lakeside.Host.SharedExperienceAsync(
            lakeside.Id, "Sunrise canoe to Heron Point", "Did", "Sat morning", "Heron Point", TestPhotos.WithLocation(MagickFormat.Jpeg));
        api.Clock.Advance(TimeSpan.FromMinutes(5));
        var taqueria = await joel.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant");

        var cards = await joel.ExperiencesAsync(lakeside.Id);

        Assert.Equal(["La Paloma Taqueria", "Sunrise canoe to Heron Point"], cards.Titles());
        var first = cards[0];
        Assert.Equal(taqueria.Id(), first.Id());
        Assert.Equal("Restaurant", first.GetProperty("kind").GetString());
        Assert.Equal("Joel", first.GetProperty("sharedBy").GetProperty("firstName").GetString());
        Assert.Equal(JsonValueKind.Null, first.GetProperty("pictureUrl").ValueKind);
        Assert.Equal("🏕️", first.GetProperty("emoji").GetString());
        Assert.Equal("Teal", first.GetProperty("colour").GetString());
        var second = cards[1];
        Assert.Equal(canoe.Id(), second.Id());
        Assert.Equal("Mara", second.GetProperty("sharedBy").GetProperty("firstName").GetString());
        Assert.Equal("Sat morning", second.GetProperty("when").GetString());
        Assert.Equal(canoe.GetProperty("sharedAt").GetDateTimeOffset(), second.GetProperty("sharedAt").GetDateTimeOffset());
        Assert.Equal(HttpStatusCode.OK, (await joel.GetAsync(second.GetProperty("pictureUrl").GetString())).StatusCode);
        Assert.Equal(
            ["average", "colour", "emoji", "id", "keenCount", "kind", "pictureUrl", "ratingCount", "sharedAt", "sharedBy", "title", "when"],
            first.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given something the group did, a restaurant and something it wants to do,
    // when a member chooses a filter,
    // then "all", or no filter, lists the three, "did" what it did and the restaurant, and "want" what it wants to do (L2-037 AC4).
    [Theory]
    [InlineData("", "Stargazing|La Paloma Taqueria|Ridge trail loop")]
    [InlineData("filter=all", "Stargazing|La Paloma Taqueria|Ridge trail loop")]
    [InlineData("filter=did", "La Paloma Taqueria|Ridge trail loop")]
    [InlineData("filter=want", "Stargazing")]
    public async Task A_filter_narrows_the_list(string query, string expected)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        foreach (var (title, kind) in new[] { ("Ridge trail loop", "Did"), ("La Paloma Taqueria", "Restaurant"), ("Stargazing", "Want") })
        {
            await lakeside.Host.SharedExperienceAsync(lakeside.Id, title, kind);
            api.Clock.Advance(TimeSpan.FromMinutes(1));
        }

        var cards = await lakeside.Host.ExperiencesAsync(lakeside.Id, query);

        Assert.Equal(expected.Split('|'), cards.Titles());
    }

    // Given a Popkin with nothing in a filter, or with no experiences at all,
    // when a member opens Experiences, then the list is empty (L2-037 AC5, AC6).
    [Fact]
    public async Task A_filter_or_a_Popkin_with_nothing_in_it_lists_nothing()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        Assert.Equal(0, (await lakeside.Host.ExperiencesAsync(lakeside.Id)).GetArrayLength());
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop", "Did");
        Assert.Equal(0, (await lakeside.Host.ExperiencesAsync(lakeside.Id, "filter=want")).GetArrayLength());
    }

    // Given any other filter value,
    // when a member asks for the list, then 400 invalid_filter names the filter (L2-052 AC1).
    [Theory]
    [InlineData("mine")]
    [InlineData("Did")]
    [InlineData("WantToDo")]
    [InlineData("all,did")]
    public async Task Any_other_filter_is_refused(string filter)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/experiences?filter={filter}");

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, "invalid_filter");
        Assert.Equal("filter", body.GetProperty("field").GetString());
    }

    // Given a signed-in person who is not a member, or no session,
    // when they ask for the experiences of a Popkin, or of one that does not exist,
    // then 404 popkin_not_found, or 401 (L2-051 AC1);
    // a member of another Popkin sees only its own, and a wrapped-up Popkin still reads.
    [Fact]
    public async Task Only_a_member_lists_the_experiences_of_a_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop");
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var other = await stranger.PostAsync("/api/popkins", System.Net.Http.Json.JsonContent.Create(
            new { name = "Book club", emoji = "📚", colour = "Plum", length = "KeepItGoing", endsAt = (DateTimeOffset?)null }));
        var otherId = (await System.Net.Http.Json.HttpContentJsonExtensions.ReadFromJsonAsync<JsonElement>(other.Content)).GetProperty("id").GetGuid();
        await stranger.SharedExperienceAsync(otherId, "Poetry night");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/experiences")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/experiences")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/experiences")).StatusCode);
        Assert.Equal(["Poetry night"], (await stranger.ExperiencesAsync(otherId)).Titles());
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal(["Ridge trail loop"], (await lakeside.Host.ExperiencesAsync(lakeside.Id)).Titles());
    }
}
