using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>GET /api/popkins/{popkinId}/experiences/{experienceId}: one experience and the group's score (L2-038, L2-051).</summary>
public sealed class ViewExperienceTests
{
    // Given an experience with a picture, a when and a place that nobody has rated,
    // when a member opens it,
    // then it shows the card's fields with the picture at display size, its place,
    // a score of no ratings with a count for each of five to one stars (L2-038 AC5),
    // no rating of the member's own and no comments.
    [Fact]
    public async Task A_member_opens_an_experience_nobody_has_rated()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var card = await lakeside.Host.SharedExperienceAsync(
            lakeside.Id, "Sunrise canoe to Heron Point", "Did", "Sat morning", "Heron Point, Lake Ossia", TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000));

        var detail = await lakeside.Host.ExperienceAsync(lakeside.Id, card.Id());

        Assert.Equal(card.Id(), detail.Id());
        Assert.Equal("Did", detail.GetProperty("kind").GetString());
        Assert.Equal("Sunrise canoe to Heron Point", detail.GetProperty("title").GetString());
        Assert.Equal("Sat morning", detail.GetProperty("when").GetString());
        Assert.Equal("Heron Point, Lake Ossia", detail.GetProperty("place").GetString());
        Assert.Equal("🏕️", detail.GetProperty("emoji").GetString());
        Assert.Equal("Teal", detail.GetProperty("colour").GetString());
        Assert.Equal("Mara", detail.GetProperty("sharedBy").GetProperty("firstName").GetString());
        Assert.Equal(card.GetProperty("sharedAt").GetDateTimeOffset(), detail.GetProperty("sharedAt").GetDateTimeOffset());
        var picture = await lakeside.Host.GetAsync(detail.GetProperty("pictureUrl").GetString());
        using var display = new MagickImage(await picture.Content.ReadAsByteArrayAsync());
        Assert.Equal((2048u, 1365u), (display.Width, display.Height));
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("average").ValueKind);
        Assert.Equal(0, detail.GetProperty("ratingCount").GetInt32());
        Assert.Equal(0, detail.GetProperty("keenCount").GetInt32());
        var score = detail.GetProperty("score");
        Assert.Equal(JsonValueKind.Null, score.GetProperty("average").ValueKind);
        Assert.Equal(0, score.GetProperty("ratingCount").GetInt32());
        Assert.Equal(
            [(5, 0), (4, 0), (3, 0), (2, 0), (1, 0)],
            score.GetProperty("counts").EnumerateArray().Select(c => (c.GetProperty("stars").GetInt32(), c.GetProperty("count").GetInt32())));
        Assert.Equal(["average", "counts", "ratingCount"], score.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("myRating").ValueKind);
        Assert.Equal(0, detail.GetProperty("comments").GetArrayLength());
        Assert.Equal(
            [
                "average", "canDelete", "canEdit", "canKeen", "canMarkDone", "canRate", "colour", "comments", "emoji", "id", "keen", "keenCount", "kind", "myRating", "pictureUrl",
                "place", "ratingCount", "score", "sharedAt", "sharedBy", "title", "when",
            ],
            detail.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given an experience without a picture, a when or a place,
    // when a member opens it, then each of the three is null.
    [Fact]
    public async Task A_picture_a_when_and_a_place_are_null_when_not_given()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var card = await lakeside.Host.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant");

        var detail = await lakeside.Host.ExperienceAsync(lakeside.Id, card.Id());

        Assert.Equal(JsonValueKind.Null, detail.GetProperty("pictureUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("when").ValueKind);
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("place").ValueKind);
    }

    // Given Joel shared something the group did, in Mara's Popkin where Dev is a member too,
    // when each opens it,
    // then Joel, the sharer, can edit and delete it; Mara, the Host, can delete it; Dev can do neither;
    // each can rate it (L2-040 AC6).
    [Fact]
    public async Task The_sharer_edits_and_the_sharer_or_the_Host_deletes()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var id = (await joel.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        Assert.Equal((true, true, true), Flags(await joel.ExperienceAsync(lakeside.Id, id)));
        Assert.Equal((true, false, true), Flags(await lakeside.Host.ExperienceAsync(lakeside.Id, id)));
        Assert.Equal((true, false, false), Flags(await dev.ExperienceAsync(lakeside.Id, id)));
    }

    // Given something the group wants to do, when its sharer opens it, then it cannot be rated;
    // given a Popkin that has wrapped up, when its Host opens their own experience,
    // then it still reads and nothing can be done to it (L2-045).
    [Fact]
    public async Task A_want_is_not_rated_and_a_wrapped_up_Popkin_is_read_only()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Stargazing", "Want")).Id();
        var did = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop", "Did")).Id();

        Assert.Equal((false, true, true), Flags(await lakeside.Host.ExperienceAsync(lakeside.Id, want)));
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal((false, false, false), Flags(await lakeside.Host.ExperienceAsync(lakeside.Id, did)));
    }

    // Given a signed-in person who is not a member, or no session,
    // when they open an experience, then 404 popkin_not_found, or 401 (L2-051 AC1);
    // given a member, when they open an experience that does not exist or one of another Popkin
    // through their own, then 404 experience_not_found (L2-051 AC3).
    [Fact]
    public async Task Only_a_member_opens_an_experience_and_only_one_of_their_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var other = await stranger.PostAsJsonAsync(
            "/api/popkins", new { name = "Book club", emoji = "📚", colour = "Plum", length = "KeepItGoing", endsAt = (DateTimeOffset?)null });
        var otherId = (await other.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{otherId}/experiences/{id}")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        await (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/experiences/{Guid.NewGuid()}")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).StatusCode);
    }

    private static (bool CanRate, bool CanEdit, bool CanDelete) Flags(JsonElement detail) =>
        (detail.GetProperty("canRate").GetBoolean(), detail.GetProperty("canEdit").GetBoolean(), detail.GetProperty("canDelete").GetBoolean());
}
