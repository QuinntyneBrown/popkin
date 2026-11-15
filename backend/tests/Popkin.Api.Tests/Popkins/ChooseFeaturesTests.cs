using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Domain;

namespace Popkin.Api.Tests.Popkins;

/// <summary>
/// The person starting a Popkin chooses its features (L2-152): a feature is on only while the
/// admin app offers it and the Host has it switched on (ADR 0026).
/// </summary>
public sealed class ChooseFeaturesTests
{
    private static async Task<(Guid Id, HttpClient Host)> StartAsync(ApiFactory api, object features)
    {
        var host = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");
        var body = new Dictionary<string, object?>
        {
            ["name"] = "Lakeside Weekend",
            ["emoji"] = "🏕️",
            ["colour"] = "Teal",
            ["length"] = "TheWeekend",
            ["endsAt"] = api.Clock.GetUtcNow().AddDays(1),
        };
        foreach (var property in features.GetType().GetProperties())
        {
            body[property.Name] = property.GetValue(features);
        }

        var response = await host.PostAsJsonAsync("/api/popkins", body);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        return (created.GetProperty("id").GetGuid(), host);
    }

    // Given Plan and Schedules on for everyone, when a Popkin is created with Plan switched off,
    // then it has Schedules and not Plan, and Plan is refused as switched off by its Host
    // (L2-152 AC4, AC7; L2-077 AC1, AC3).
    [Fact]
    public async Task A_Popkin_created_with_Plan_switched_off_has_Schedules_and_not_Plan()
    {
        using var api = new ApiFactory();
        var (id, host) = await StartAsync(api, new { plan = false });

        var header = await host.GetFromJsonAsync<JsonElement>($"/api/popkins/{id}");
        var board = await host.GetAsync($"/api/popkins/{id}/plan");

        Assert.False(header.GetProperty("plan").GetBoolean());
        Assert.True(header.GetProperty("schedules").GetBoolean());
        var problem = await board.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.Equal("Host", problem.GetProperty("switchedOffBy").GetString());
    }

    // Given a request that leaves the features out, when the Popkin is created, then each is on
    // (L2-152 AC7).
    [Fact]
    public async Task A_feature_the_request_leaves_out_is_on()
    {
        using var api = new ApiFactory();
        var (id, host) = await StartAsync(api, new { });

        var header = await host.GetFromJsonAsync<JsonElement>($"/api/popkins/{id}");

        Assert.True(header.GetProperty("plan").GetBoolean());
        Assert.True(header.GetProperty("schedules").GetBoolean());
    }

    // Given a feature the admin app has off, when a member opens it, then the refusal says Popkin
    // switched it off, not the Host (L2-077 AC2).
    [Fact]
    public async Task A_feature_off_in_the_admin_app_is_refused_as_switched_off_by_Popkin()
    {
        using var api = new ApiFactory();
        await api.SwitchFeatureAsync(Feature.Plan, FeatureMode.Off);
        var (id, host) = await StartAsync(api, new { plan = false });

        var board = await host.GetAsync($"/api/popkins/{id}/plan");

        var problem = await board.AssertProblem(HttpStatusCode.NotFound, "feature_off");
        Assert.Equal("Popkin", problem.GetProperty("switchedOffBy").GetString());
    }

    // Given Plan on for chosen Popkins only and Schedules on for everyone, when a signed-in person
    // asks which features a new Popkin is offered, then the answer is Schedules alone (L2-152 AC8).
    [Fact]
    public async Task A_new_Popkin_is_offered_only_the_features_on_for_everyone()
    {
        using var api = new ApiFactory();
        await api.SwitchFeatureAsync(Feature.Plan, FeatureMode.Chosen);
        var person = await api.SignedUpAsync("Mara Okafor", "(415) 555-0148");

        var answer = await person.GetFromJsonAsync<JsonElement>("/api/popkins/features");

        Assert.Equal(["Schedules"], answer.GetProperty("offered").EnumerateArray().Select(f => f.GetString()));
    }

    // Given no session, when the offered features are asked for, then the answer is 401.
    [Fact]
    public async Task Without_a_session_the_offered_features_are_not_answered()
    {
        using var api = new ApiFactory();

        var response = await api.CreateBrowserClient().GetAsync("/api/popkins/features");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
