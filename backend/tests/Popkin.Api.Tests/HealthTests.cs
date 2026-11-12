using System.Net;
using System.Net.Http.Json;

namespace Popkin.Api.Tests;

public sealed class HealthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Health_answers_ok_without_a_session()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ok", body!["status"]);
    }
}
