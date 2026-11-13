using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// GET /api/popkins/{popkinId}/wrap-up: what the wrap-up screen tells the Host the recap will
/// count, "all 14 of you" and "48 photos, 1,286 messages" (L2-043 AC1).
/// </summary>
public sealed class WrapUpPreviewTests
{
    // Given Lakeside with two members, three messages its members wrote and two photos,
    // when its Host opens the wrap-up screen,
    // then it counts the members, the photos and the messages, and the note Popkin wrote when someone joined is not a message.
    [Fact]
    public async Task The_Host_reads_what_the_recap_will_count()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        await api.AddMessagesAsync(lakeside.Id, 3, TimeSpan.FromMinutes(1));
        await api.AddPhotosAsync(lakeside.Id, "Mara Okafor", 2, TimeSpan.FromMinutes(1));

        var preview = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/popkins/{lakeside.Id}/wrap-up");

        Assert.Equal(2, preview.GetProperty("memberCount").GetInt32());
        Assert.Equal(2, preview.GetProperty("photoCount").GetInt32());
        Assert.Equal(3, preview.GetProperty("messageCount").GetInt32());
        Assert.Equal(["memberCount", "messageCount", "photoCount"], preview.EnumerateObject().Select(p => p.Name).Order());
    }

    // Given a member who is not the Host, then 403 host_only; someone who is not a member, 404 popkin_not_found;
    // and once the Popkin has wrapped up, 409 popkin_wrapped_up: there is nothing left to wrap up.
    [Fact]
    public async Task Only_the_Host_of_an_active_Popkin_reads_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var path = $"/api/popkins/{lakeside.Id}/wrap-up";

        await (await joel.GetAsync(path)).AssertProblem(HttpStatusCode.Forbidden, "host_only");
        await (await sam.GetAsync(path)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);
        await (await lakeside.Host.GetAsync(path)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        await (await sam.GetAsync(path)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }
}
