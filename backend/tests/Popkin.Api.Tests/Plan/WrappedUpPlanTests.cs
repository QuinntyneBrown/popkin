using System.Net;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Plan;

/// <summary>
/// The plan of a wrapped-up Popkin stays readable, and nobody can change it (L2-069 AC8,
/// L2-070 AC7).
/// </summary>
public sealed class WrappedUpPlanTests
{
    // Given a wrapped-up Popkin with a story, when the Host reads the board, then every story is
    // there; when anyone adds, moves, saves or deletes one, then 409 popkin_wrapped_up and
    // nothing changes.
    [Fact]
    public async Task The_board_is_read_and_every_change_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var van = await api.SeedStoryAsync(lakeside.Id, "Rent a 7-seat van", StoryColumn.ToDo, 5);
        await api.WrapUpAsync(lakeside.Id);
        var host = lakeside.Host;
        var before = await host.PlanBoardAsync(lakeside.Id);

        await (await host.AddStoryAsync(lakeside.Id, "Cabin playlist")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await host.MoveStoryAsync(lakeside.Id, van, "Doing")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await host.SaveStoryAsync(lakeside.Id, van, "Rent a 9-seat van")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await host.DeleteStoryAsync(lakeside.Id, van)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");

        var after = await host.PlanBoardAsync(lakeside.Id);
        Assert.Equal(["Rent a 7-seat van"], after.TitlesIn("ToDo"));
        Assert.Equal(before.GetProperty("version").GetInt64(), after.GetProperty("version").GetInt64());
    }
}
