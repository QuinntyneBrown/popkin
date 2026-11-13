using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Experiences;

/// <summary>POST /api/popkins/{popkinId}/experiences: a member shares an experience (L2-040, L2-045 AC2, L2-051 AC1).</summary>
public sealed class ShareExperienceTests
{
    // Given a member of an active Popkin,
    // when they share an experience with a title, a kind, a when and a place and no picture,
    // then 201 answers its card, with a Location of the experience:
    // the Popkin's emoji and colour stand in the picture's place (L2-040 AC5), and nobody has rated it.
    [Fact]
    public async Task A_member_shares_an_experience()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var now = api.Clock.GetUtcNow();

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "  Sunrise canoe to Heron Point  ", "Did", " Sat morning ", " Heron Point, Lake Ossia ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var card = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal($"/api/popkins/{lakeside.Id}/experiences/{card.Id()}", response.Headers.Location?.OriginalString);
        Assert.Equal("Did", card.GetProperty("kind").GetString());
        Assert.Equal("Sunrise canoe to Heron Point", card.GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, card.GetProperty("pictureUrl").ValueKind);
        Assert.Equal("🏕️", card.GetProperty("emoji").GetString());
        Assert.Equal("Teal", card.GetProperty("colour").GetString());
        var sharedBy = card.GetProperty("sharedBy");
        Assert.NotEqual(Guid.Empty, sharedBy.GetProperty("membershipId").GetGuid());
        Assert.Equal("Mara", sharedBy.GetProperty("firstName").GetString());
        Assert.Equal("MO", sharedBy.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(["avatar", "firstName", "membershipId"], sharedBy.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Sat morning", card.GetProperty("when").GetString());
        Assert.Equal(now, card.GetProperty("sharedAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, card.GetProperty("average").ValueKind);
        Assert.Equal(0, card.GetProperty("ratingCount").GetInt32());
        Assert.Equal(0, card.GetProperty("keenCount").GetInt32());
        Assert.Equal(
            ["average", "colour", "emoji", "id", "keenCount", "kind", "pictureUrl", "ratingCount", "sharedAt", "sharedBy", "title", "when"],
            card.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given only a title and a kind, when a member shares it, then its when is null;
    // a when of white space is none; each of the three kinds is kept.
    [Theory]
    [InlineData("Did")]
    [InlineData("Restaurant")]
    [InlineData("Want")]
    public async Task A_when_and_a_place_are_optional(string kind)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var bare = await lakeside.Host.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", kind);
        var blank = await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop", kind, "   ", "   ");

        Assert.Equal(kind, bare.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, bare.GetProperty("when").ValueKind);
        Assert.Equal(JsonValueKind.Null, blank.GetProperty("when").ValueKind);
    }

    // Given a member who is not the Host,
    // when they share an experience, then it is theirs, under their name.
    [Fact]
    public async Task Any_member_shares_an_experience_under_their_own_name()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");

        var card = await joel.SharedExperienceAsync(lakeside.Id, "Bonfire songs on the beach");

        Assert.Equal("Joel", card.GetProperty("sharedBy").GetProperty("firstName").GetString());
    }

    // Given a signed-in person who is not a member, or no session,
    // when they share an experience in a Popkin, or in one that does not exist,
    // then 404 popkin_not_found, or 401, and nothing is saved (L2-051 AC1).
    [Fact]
    public async Task Only_a_member_shares_an_experience()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.ShareExperienceAsync(lakeside.Id, "Bonfire")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.ShareExperienceAsync(Guid.NewGuid(), "Bonfire")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().ShareExperienceAsync(lakeside.Id, "Bonfire")).StatusCode);
        Assert.Equal(0, ExperienceCount(api));
    }

    // Given a wrapped-up Popkin,
    // when a member shares an experience, then 409 popkin_wrapped_up, and nothing is saved (L2-045 AC2).
    [Fact]
    public async Task Nothing_is_shared_in_a_wrapped_up_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Bonfire");

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(0, ExperienceCount(api));
    }

    internal static int ExperienceCount(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Experiences.Count();
    }
}
