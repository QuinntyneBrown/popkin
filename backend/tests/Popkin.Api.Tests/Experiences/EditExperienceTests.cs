using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>PATCH /api/popkins/{popkinId}/experiences/{experienceId}: the sharer edits their experience (L2-040 AC6, L2-045 AC2, L2-052).</summary>
public sealed class EditExperienceTests
{
    // Given Joel shared a restaurant that Mara gave four stars,
    // when Joel changes its title, kind, when and place,
    // then 200 answers its card as it now is, still shared when it was, with its score.
    [Fact]
    public async Task The_sharer_edits_their_experience()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var shared = await joel.SharedExperienceAsync(lakeside.Id, "Tacos", "Restaurant", "Fri", "Town");
        await lakeside.Host.RatedAsync(lakeside.Id, shared.Id(), 4);
        api.Clock.Advance(TimeSpan.FromHours(1));

        var response = await joel.EditExperienceAsync(lakeside.Id, shared.Id(), "  La Paloma Taqueria  ", "Did", "Fri night", "Main Street");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var card = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(shared.Id(), card.Id());
        Assert.Equal("La Paloma Taqueria", card.GetProperty("title").GetString());
        Assert.Equal("Did", card.GetProperty("kind").GetString());
        Assert.Equal("Fri night", card.GetProperty("when").GetString());
        Assert.Equal(shared.GetProperty("sharedAt").GetDateTimeOffset(), card.GetProperty("sharedAt").GetDateTimeOffset());
        Assert.Equal("Joel", card.GetProperty("sharedBy").GetProperty("firstName").GetString());
        Assert.Equal((4.0, 1), (card.GetProperty("average").GetDouble(), card.GetProperty("ratingCount").GetInt32()));
        Assert.Equal(
            ["average", "colour", "emoji", "id", "keenCount", "kind", "pictureUrl", "ratingCount", "sharedAt", "sharedBy", "title", "when"],
            card.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Main Street", (await joel.ExperienceAsync(lakeside.Id, shared.Id())).GetProperty("place").GetString());
    }

    // Given an experience with a when and a place,
    // when its sharer sends only a new title, then the rest stays;
    // when they send an empty when and an empty place, then both are cleared and the title stays.
    [Fact]
    public async Task A_field_that_is_not_sent_stays_and_an_empty_when_or_place_is_cleared()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Tacos", "Restaurant", "Fri", "Town")).Id();

        await lakeside.Host.EditExperienceAsync(lakeside.Id, id, title: "La Paloma Taqueria");
        var renamed = await lakeside.Host.ExperienceAsync(lakeside.Id, id);
        await lakeside.Host.EditExperienceAsync(lakeside.Id, id, when: "", place: "  ");
        var cleared = await lakeside.Host.ExperienceAsync(lakeside.Id, id);

        Assert.Equal(
            ("La Paloma Taqueria", "Restaurant", "Fri", "Town"),
            (renamed.GetProperty("title").GetString(), renamed.GetProperty("kind").GetString(), renamed.GetProperty("when").GetString(), renamed.GetProperty("place").GetString()));
        Assert.Equal("La Paloma Taqueria", cleared.GetProperty("title").GetString());
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("when").ValueKind);
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("place").ValueKind);
    }

    // Given an experience with a picture,
    // when its sharer sends another, then the new one is stored and the files of the old one are deleted;
    // when they then remove the picture, then no file is left and the card has no picture.
    [Fact]
    public async Task The_sharer_replaces_or_removes_the_picture()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop", picture: TestPhotos.WithLocation(MagickFormat.Jpeg, 800, 600))).Id();
        var before = api.Photos.Files.Keys.ToList();

        var replaced = await (await lakeside.Host.EditExperienceAsync(lakeside.Id, id, picture: TestPhotos.FromAPhone(width: 400, height: 300)))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(2, api.Photos.Files.Count);
        Assert.Empty(api.Photos.Files.Keys.Intersect(before));
        var thumbnail = await lakeside.Host.GetAsync(replaced.GetProperty("pictureUrl").GetString());
        using var small = new MagickImage(await thumbnail.Content.ReadAsByteArrayAsync());
        Assert.Equal((400u, 300u), (small.Width, small.Height));
        Assert.Null(small.GetExifProfile());

        var removed = await (await lakeside.Host.EditExperienceAsync(lakeside.Id, id, removePicture: true)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(JsonValueKind.Null, removed.GetProperty("pictureUrl").ValueKind);
        Assert.Empty(api.Photos.Files);
        Assert.Equal("Ridge trail loop", removed.GetProperty("title").GetString());
    }

    public static TheoryData<string?, string?, string?, string?, bool, string, string> RefusedEdits => new()
    {
        { "   ", null, null, null, false, "title_required", "title" },
        { new string('a', 81), null, null, null, false, "title_too_long", "title" },
        { null, "Picnic", null, null, false, "invalid_kind", "kind" },
        { null, null, new string('a', 41), null, false, "when_too_long", "when" },
        { null, null, null, new string('a', 81), false, "place_too_long", "place" },
        { null, null, null, null, true, "picture_type_not_allowed", "picture" },
    };

    // Given a field that breaks its rule, when the sharer edits with it,
    // then 400 with its code names the field, and the experience and its picture stay as they were.
    [Theory]
    [MemberData(nameof(RefusedEdits))]
    public async Task An_edit_keeps_the_rules_of_sharing(string? title, string? kind, string? when, string? place, bool badPicture, string code, string field)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Tacos", "Restaurant", "Fri", "Town", TestPhotos.WithLocation(MagickFormat.Jpeg))).Id();
        var before = (await lakeside.Host.ExperienceAsync(lakeside.Id, id)).ToString();
        var files = api.Photos.Files.Keys.Order().ToList();

        var response = await lakeside.Host.EditExperienceAsync(
            lakeside.Id, id, title, kind, when, place, badPicture ? "This is not a picture."u8.ToArray() : null);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, body.GetProperty("field").GetString());
        Assert.Equal(files, api.Photos.Files.Keys.Order());
        Assert.Equal(WithoutAddresses(before), WithoutAddresses((await lakeside.Host.ExperienceAsync(lakeside.Id, id)).ToString()));
    }

    // Given Joel shared an experience in Mara's Popkin, where Dev is a member too,
    // when Mara, the Host, or Dev edits it, then 403 not_experience_sharer, and it stays as it was (L2-040 AC6).
    [Fact]
    public async Task Only_the_sharer_edits_an_experience()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var id = (await joel.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        await (await lakeside.Host.EditExperienceAsync(lakeside.Id, id, "Mine now")).AssertProblem(HttpStatusCode.Forbidden, "not_experience_sharer");
        await (await dev.EditExperienceAsync(lakeside.Id, id, "Mine now")).AssertProblem(HttpStatusCode.Forbidden, "not_experience_sharer");
        Assert.Equal("Ridge trail loop", (await joel.ExperienceAsync(lakeside.Id, id)).GetProperty("title").GetString());
    }

    // Given a signed-in person who is not a member, or no session, when they edit, then 404 popkin_not_found, or 401;
    // given an experience that is not in the Popkin, then 404 experience_not_found;
    // given a wrapped-up Popkin, when the sharer edits, then 409 popkin_wrapped_up (L2-045 AC2).
    [Fact]
    public async Task An_edit_needs_a_member_an_experience_of_the_Popkin_and_an_active_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.EditExperienceAsync(lakeside.Id, id, "Mine now")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.EditExperienceAsync(lakeside.Id, Guid.NewGuid(), "Lost")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().EditExperienceAsync(lakeside.Id, id, "Mine now")).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        await (await lakeside.Host.EditExperienceAsync(lakeside.Id, id, "Too late")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal("Ridge trail loop", (await lakeside.Host.ExperienceAsync(lakeside.Id, id)).GetProperty("title").GetString());
    }

    /// <summary>An answer without what changes from one read to the next: the signature of a signed address.</summary>
    private static string WithoutAddresses(string json) => System.Text.RegularExpressions.Regex.Replace(json, "expires=[^\"]*", "");
}
