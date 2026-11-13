using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// What POST /api/popkins/{popkinId}/experiences refuses of its text (L2-040 AC2, AC3, L2-052 AC1).
/// Every case of each rule is in `ExperienceFieldsTests`.
/// </summary>
public sealed class RefusedExperienceTests
{
    public static TheoryData<string?, string?, string?, string?, string, string> RefusedFields => new()
    {
        { null, "Did", null, null, "title_required", "title" },
        { "   ", "Did", null, null, "title_required", "title" },
        { new string('a', 81), "Did", null, null, "title_too_long", "title" },
        { "Bonfire", "Did", null, new string('a', 81), "place_too_long", "place" },
        { "Bonfire", "Did", new string('a', 41), null, "when_too_long", "when" },
        { "Bonfire", null, null, null, "invalid_kind", "kind" },
        { "Bonfire", "Picnic", null, null, "invalid_kind", "kind" },
    };

    // Given a title that is empty or over 80 characters, a place over 80, a when over 40 or a kind that is not one of the three,
    // when a member shares the experience,
    // then 400 with its code names the field, and nothing is saved.
    [Theory]
    [MemberData(nameof(RefusedFields))]
    public async Task A_field_that_breaks_its_rule_is_refused(string? title, string? kind, string? when, string? place, string code, string field)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await lakeside.Host.ShareExperienceAsync(lakeside.Id, title, kind, when, place);

        var body = await response.AssertProblem(HttpStatusCode.BadRequest, code);
        Assert.Equal(field, body.GetProperty("field").GetString());
        Assert.Equal(0, ShareExperienceTests.ExperienceCount(api));
    }

    // Given a title and a place of exactly 80 characters and a when of 40,
    // when a member shares the experience, then it is saved.
    [Fact]
    public async Task A_title_and_a_place_of_80_characters_are_kept()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var card = await lakeside.Host.SharedExperienceAsync(
            lakeside.Id, new string('a', 80), "Restaurant", new string('b', 40), new string('c', 80));

        Assert.Equal(80, card.GetProperty("title").GetString()!.Length);
        Assert.Equal(40, card.GetProperty("when").GetString()!.Length);
    }

    // Given a title that is markup,
    // when a member shares it, then it is kept and answered as the text it is (L2-052 AC2).
    [Fact]
    public async Task Markup_in_a_title_is_text()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var card = await lakeside.Host.SharedExperienceAsync(lakeside.Id, "<script>alert(1)</script>", when: "<b>Sat</b>");

        Assert.Equal("<script>alert(1)</script>", card.GetProperty("title").GetString());
        Assert.Equal("<b>Sat</b>", card.GetProperty("when").GetString());
    }
}
