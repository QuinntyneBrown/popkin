using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Popkin.Api.Tests.Support;

public static class ProblemAssertions
{
    /// <summary>Asserts a ProblemDetails answer with its status and `code`, and returns its body.</summary>
    public static async Task<JsonElement> AssertProblem(this HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(code, body.GetProperty("code").GetString());
        return body;
    }
}
