using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// Every change to the plan is sent to every member with the Popkin open as `PlanChanged`, with
/// the board's version, so an open board reads itself again without a reload (L2-068 AC12).
/// </summary>
public sealed class PlanLiveTests
{
    // Given Joel has the Popkin open, when the Host adds, moves, saves and deletes a story, then
    // Joel hears PlanChanged after each, carrying the version the board then answers.
    [Fact]
    public async Task Every_member_hears_each_change_with_the_boards_version()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var host = lakeside.Host;

        var added = await (await host.AddStoryAsync(lakeside.Id, "Rent a 7-seat van")).Content.ReadFromJsonAsync<JsonElement>();
        var id = added.GetProperty("id").GetGuid();
        await AssertHeardAsync(joelHub, joel, lakeside.Id);

        await host.MoveStoryAsync(lakeside.Id, id, "Doing");
        await AssertHeardAsync(joelHub, joel, lakeside.Id);

        await host.SaveStoryAsync(lakeside.Id, id, "Rent a 9-seat van", column: "Doing");
        await AssertHeardAsync(joelHub, joel, lakeside.Id);

        await host.DeleteStoryAsync(lakeside.Id, id);
        await AssertHeardAsync(joelHub, joel, lakeside.Id);

        Assert.Equal(4, joelHub.ReceivedNamed("PlanChanged").Count);
    }

    // Given a write that is refused, then nobody hears anything.
    [Fact]
    public async Task A_refused_change_is_not_sent()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        await using var hostHub = await api.CreateHubConnectionAsync(lakeside.Host);

        await joel.DeleteStoryAsync(lakeside.Id, van);
        await lakeside.Host.MoveStoryAsync(lakeside.Id, van, "Doing");

        // The move is heard, and it is the only change: the refused delete sent nothing before it.
        await hostHub.WaitForAsync("PlanChanged");
        Assert.Single(hostHub.ReceivedNamed("PlanChanged"));
    }

    private static async Task AssertHeardAsync(HubEvents hub, HttpClient member, Guid popkinId)
    {
        var version = (await member.PlanBoardAsync(popkinId)).GetProperty("version").GetInt64();
        var heard = await hub.WaitForAsync("PlanChanged", e => e.Arguments[1].GetInt64() == version);
        Assert.Equal(popkinId, heard.Arguments[0].GetGuid());
    }
}
