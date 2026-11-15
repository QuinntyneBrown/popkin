using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>GET /api/popkins/{popkinId}/recap: the stories done out of the stories made (L2-075 AC4).</summary>
public sealed class PlanRecapTests
{
    // Given four stories, Backlog among them, two of them done, and a fifth deleted, when the
    // Popkin wraps up, then the recap counts 2 done of the 4 made, a deleted story not among them.
    [Fact]
    public async Task Counts_the_stories_done_out_of_the_stories_made()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var host = lakeside.Host;
        var van = await AddAsync(host, lakeside.Id, "Rent a 7-seat van", "ToDo");
        var deposits = await AddAsync(host, lakeside.Id, "Collect $150 deposits", "ToDo");
        await AddAsync(host, lakeside.Id, "Grocery list for three dinners", "ToDo");
        await AddAsync(host, lakeside.Id, "Kayak rental for two days", "Backlog");
        var gone = await AddAsync(host, lakeside.Id, "Check fishing licence rules", "ToDo");
        await host.MoveStoryAsync(lakeside.Id, van, "Done");
        await host.MoveStoryAsync(lakeside.Id, deposits, "Done");
        await host.DeleteStoryAsync(lakeside.Id, gone);
        await host.WrappedUpAsync(lakeside.Id);

        var stories = (await host.ReadRecapAsync(lakeside.Id)).GetProperty("stories");

        Assert.Equal(2, stories.GetProperty("done").GetInt32());
        Assert.Equal(4, stories.GetProperty("made").GetInt32());
    }

    // Given a Popkin with no story, or one with stories while Plan is off, then the recap has no
    // count of stories, and shows no plan (L2-075 AC3, AC4; L2-077 AC6).
    [Fact]
    public async Task Counts_nothing_without_a_story_or_while_Plan_is_off()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        Assert.Equal(JsonValueKind.Null, (await lakeside.Host.ReadRecapAsync(lakeside.Id)).GetProperty("stories").ValueKind);

        using var off = new ApiFactory();
        off.Settings["Features:Plan"] = "false";
        var other = await off.StartLakesideAsync();
        await off.SeedStoryAsync(other.Id, "Rent a 7-seat van", StoryColumn.Done, 5);
        await other.Host.WrappedUpAsync(other.Id);
        Assert.Equal(JsonValueKind.Null, (await other.Host.ReadRecapAsync(other.Id)).GetProperty("stories").ValueKind);
    }

    private static async Task<Guid> AddAsync(HttpClient member, Guid popkinId, string title, string column)
    {
        var response = await member.AddStoryAsync(popkinId, title, column, 2);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }
}
