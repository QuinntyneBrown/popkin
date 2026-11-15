using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Schedules;

/// <summary>
/// The Schedule of a wrapped-up Popkin is read-only: its time off and this week are still read,
/// and say they can no longer be changed (L2-045 AC2).
/// </summary>
public sealed class WrappedUpScheduleTests
{
    // Given a wrapped-up Popkin, when a member reads its time off and this week, then both answer,
    // with `canEdit` false, so neither "Add my time off" nor "My hours" is offered.
    [Theory]
    [InlineData("schedule/time-off?week=2026-09-14")]
    [InlineData("schedule/week?from=2026-09-12")]
    public async Task A_wrapped_up_Popkins_Schedule_is_read_only(string path)
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var read = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/{path}");

        Assert.False(read.GetProperty("canEdit").GetBoolean());
    }
}
