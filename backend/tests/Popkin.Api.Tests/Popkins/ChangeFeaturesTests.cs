using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Popkins;

/// <summary>
/// GET and PUT /api/popkins/{id}/features: the Host switches Plan and Schedules on and off among
/// the features the admin app offers the Popkin (L2-153, ADR 0026).
/// </summary>
public sealed class ChangeFeaturesTests
{
    private static Task<HttpResponseMessage> ChangeAsync(HttpClient client, Guid popkinId, object body) =>
        client.PutAsJsonAsync($"/api/popkins/{popkinId}/features", body);

    private static IEnumerable<(string Feature, bool On)> Choices(JsonElement features) =>
        features.GetProperty("choices").EnumerateArray()
            .Select(c => (c.GetProperty("feature").GetString()!, c.GetProperty("on").GetBoolean()));

    // Given Schedules is on for chosen Popkins without this one, when a member reads the
    // features, then the choices list Plan alone, in the Host's choice (L2-153 AC2, AC8).
    [Fact]
    public async Task A_member_reads_the_choices_of_the_offered_features()
    {
        using var api = new ApiFactory();
        await api.SwitchFeatureAsync(Feature.Schedules, FeatureMode.Chosen);
        var lakeside = await api.StartLakesideAsync();

        var features = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/features");

        Assert.Equal([("Plan", true)], Choices(features));
        Assert.True(features.GetProperty("plan").GetBoolean());
        Assert.False(features.GetProperty("schedules").GetBoolean());
    }

    // Given the Host switches Plan off and on again, when the board opens, then it was refused
    // while off and every story is as it was after (L2-153 AC3, AC5; L2-077 AC5).
    [Fact]
    public async Task The_Host_switches_Plan_off_and_on_again_and_nothing_is_lost()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.SeedStoryAsync(lakeside.Id, "Pick the dates", StoryColumn.ToDo, 3);

        var off = await ChangeAsync(lakeside.Host, lakeside.Id, new { plan = false });
        var boardWhileOff = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/plan");
        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");

        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        var features = await off.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(features.GetProperty("plan").GetBoolean());
        Assert.True(features.GetProperty("schedules").GetBoolean());
        Assert.Equal([("Plan", false), ("Schedules", true)], Choices(features));
        await boardWhileOff.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.False(header.GetProperty("plan").GetBoolean());

        var on = await ChangeAsync(lakeside.Host, lakeside.Id, new { plan = true });

        Assert.Equal(HttpStatusCode.OK, on.StatusCode);
        var board = await lakeside.Host.PlanBoardAsync(lakeside.Id);
        Assert.Equal(["Pick the dates"], board.TitlesIn("ToDo"));
    }

    // Given a member who is not the Host, when they change the features, then 403 host_only and
    // nothing changes (L2-153 AC7).
    [Fact]
    public async Task A_member_who_is_not_the_Host_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");

        var response = await ChangeAsync(joel, lakeside.Id, new { plan = false });

        await response.AssertProblem(HttpStatusCode.Forbidden, "host_only");
        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        Assert.True(header.GetProperty("plan").GetBoolean());
    }

    // Given a wrapped-up Popkin, when the Host changes its features, then 409 (L2-153 AC7).
    [Fact]
    public async Task A_wrapped_up_Popkin_keeps_its_features()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var response = await ChangeAsync(lakeside.Host, lakeside.Id, new { plan = false });

        await response.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    // Given Plan off in the admin app, when the Host switches Plan and Schedules off, then 404
    // feature_off and Schedules is not changed either (L2-153 AC7).
    [Fact]
    public async Task A_feature_the_admin_app_has_off_cannot_be_chosen()
    {
        using var api = new ApiFactory();
        await api.SwitchFeatureAsync(Feature.Plan, FeatureMode.Off);
        var lakeside = await api.StartLakesideAsync();

        var response = await ChangeAsync(lakeside.Host, lakeside.Id, new { plan = false, schedules = false });

        await response.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        var header = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}");
        Assert.True(header.GetProperty("schedules").GetBoolean());
    }
}
