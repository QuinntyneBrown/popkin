using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Popkins;

/// <summary>
/// GET /api/popkins/{popkinId}/photos/summary and /experiences/summary, the Photos and
/// Experiences sections of the Popkin home (L2-019 AC4, AC5, AC8, L2-051 AC1). The summary of
/// an album with photos is in `PhotosSummaryTests`, and that of a Popkin with experiences in
/// `ExperiencesSummaryTests`.
/// </summary>
public sealed class HomeSummariesTests
{
    // Given a Popkin with no photos,
    // when a member reads the photos summary,
    // then it counts none and lists none.
    [Fact]
    public async Task A_Popkin_without_photos_summarises_as_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/photos/summary");

        Assert.Equal(0, summary.GetProperty("count").GetInt32());
        Assert.Equal(0, summary.GetProperty("photos").GetArrayLength());
        Assert.Equal(["count", "photos"], summary.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given a Popkin with no experiences,
    // when a member reads the experiences summary,
    // then it counts none and has no top experience.
    [Fact]
    public async Task A_Popkin_without_experiences_summarises_as_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/experiences/summary");

        Assert.Equal(0, summary.GetProperty("count").GetInt32());
        Assert.Equal(0, summary.GetProperty("top").GetArrayLength());
        Assert.Equal(["count", "top"], summary.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given a signed-in person who is not a member,
    // when they ask for either summary of a Popkin, or of one that does not exist,
    // then both answer 404 popkin_not_found, and no session answers 401;
    // a wrapped-up Popkin still reads for its members.
    [Theory]
    [InlineData("photos/summary")]
    [InlineData("experiences/summary")]
    public async Task Only_a_member_reads_a_summary(string section)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/{section}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/{section}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/{section}")).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/{section}")).StatusCode);
    }
}
