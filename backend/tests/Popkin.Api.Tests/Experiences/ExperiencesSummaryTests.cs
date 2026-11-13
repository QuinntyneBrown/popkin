using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// GET /api/popkins/{popkinId}/experiences/summary: the Experiences section of the Popkin home
/// (L2-019 AC5). The empty summary and who may read it are in `HomeSummariesTests`.
/// </summary>
public sealed class ExperiencesSummaryTests
{
    // Given six experiences: a canoe trip at 4.7 from three ratings, a taqueria at 5.0 from one,
    // a trail at 4.0 from two, a bake at 4.0 from one, a picnic nobody rated and a wish,
    // when a member reads the summary,
    // then it counts all six and names the three highest rated, the highest first;
    // of two with one average, the one more members rated comes first.
    [Fact]
    public async Task The_summary_counts_every_experience_and_names_the_highest_rated()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var mara = lakeside.Host;
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var bake = (await mara.SharedExperienceAsync(lakeside.Id, "Saturday bake")).Id();
        var canoe = (await mara.SharedExperienceAsync(lakeside.Id, "Sunrise canoe to Heron Point", picture: TestPhotos.WithLocation(MagickFormat.Jpeg, 3000, 2000))).Id();
        var taqueria = (await joel.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant")).Id();
        var trail = (await dev.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        await mara.SharedExperienceAsync(lakeside.Id, "Picnic on the lawn");
        await mara.SharedExperienceAsync(lakeside.Id, "Stargazing", "Want");
        await joel.RatedAsync(lakeside.Id, bake, 4);
        await mara.RatedAsync(lakeside.Id, canoe, 5);
        await joel.RatedAsync(lakeside.Id, canoe, 5);
        await dev.RatedAsync(lakeside.Id, canoe, 4);
        await mara.RatedAsync(lakeside.Id, taqueria, 5);
        await mara.RatedAsync(lakeside.Id, trail, 4);
        await joel.RatedAsync(lakeside.Id, trail, 4);

        var summary = await dev.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/experiences/summary");

        Assert.Equal(6, summary.GetProperty("count").GetInt32());
        var top = summary.GetProperty("top").EnumerateArray().ToList();
        Assert.Equal(
            [(taqueria, "La Paloma Taqueria", 5.0, 1), (canoe, "Sunrise canoe to Heron Point", 4.7, 3), (trail, "Ridge trail loop", 4.0, 2)],
            top.Select(t => (t.Id(), t.GetProperty("name").GetString()!, t.GetProperty("average").GetDouble(), t.GetProperty("ratingCount").GetInt32())));
        Assert.Equal(JsonValueKind.Null, top[0].GetProperty("photoUrl").ValueKind);
        var thumbnail = await dev.GetAsync(top[1].GetProperty("photoUrl").GetString());
        using var small = new MagickImage(await thumbnail.Content.ReadAsByteArrayAsync());
        Assert.Equal((480u, 320u), (small.Width, small.Height));
        Assert.Equal(["average", "id", "name", "photoUrl", "ratingCount"], top[0].EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal(["count", "top"], summary.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given experiences nobody has rated,
    // when a member reads the summary, then it counts them and names none as highest rated;
    // an experience of another Popkin is not counted.
    [Fact]
    public async Task Experiences_nobody_rated_are_counted_and_none_is_the_highest_rated()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Picnic on the lawn");
        await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Stargazing", "Want");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var other = await sam.PostAsJsonAsync(
            "/api/popkins", new { name = "Book club", emoji = "📚", colour = "Plum", length = "KeepItGoing", endsAt = (DateTimeOffset?)null });
        var otherId = (await other.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await sam.RatedAsync(otherId, (await sam.SharedExperienceAsync(otherId, "Poetry night")).Id(), 5);

        var summary = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/experiences/summary");

        Assert.Equal(2, summary.GetProperty("count").GetInt32());
        Assert.Equal(0, summary.GetProperty("top").GetArrayLength());
    }
}
