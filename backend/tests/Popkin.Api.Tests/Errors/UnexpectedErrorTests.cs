using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Errors;

/// <summary>An unexpected failure is a 500 with a reference code and nothing internal (L2-056 AC6, L2-052 AC5).</summary>
public sealed class UnexpectedErrorTests
{
    [Fact]
    public async Task An_unexpected_failure_answers_500_with_a_reference_and_no_internals()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        await client.SignUpAsync(api, "Mara", "(415) 555-0148");
        api.Faults.FailSaves = true;

        var response = await client.PostAsJsonAsync("/api/popkins", new { name = "Lakeside Weekend", emoji = "🏕️", colour = "Teal", length = "KeepItGoing", endsAt = (DateTimeOffset?)null });

        var body = await response.AssertProblem(HttpStatusCode.InternalServerError, "server_error");
        Assert.Matches(new Regex("^PK-[0-9A-F]{4}-[0-9A-F]{4}$"), body.GetProperty("reference").GetString());
        var text = body.GetRawText();
        Assert.DoesNotContain("Simulated", text);
        Assert.DoesNotContain("Popkins", text);
        Assert.DoesNotContain(" at ", text);
    }

    // Given a member whose reaction fails unexpectedly,
    // when the failure is logged,
    // then the log names the route by its template and carries neither the emoji the member
    // chose nor its encoding: an emoji is content (ADR 0012, L2-054 AC3).
    [Fact]
    public async Task An_unexpected_failure_is_logged_by_its_route_template()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var message = (await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Pancakes at nine")).Id();
        api.Faults.FailSaves = true;

        var response = await lakeside.Host.ReactAsync(lakeside.Id, threadId, message, "🥞");

        await response.AssertProblem(HttpStatusCode.InternalServerError, "server_error");
        var logged = string.Join("\n", api.Logs.Lines);
        Assert.Contains("api/popkins/{popkinId:guid}/threads/{threadId:guid}/messages/{messageId:guid}/reactions/{emoji}", logged);
        Assert.DoesNotContain("🥞", logged);
        Assert.DoesNotContain(Uri.EscapeDataString("🥞"), logged, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(message.ToString(), logged);
    }
}
