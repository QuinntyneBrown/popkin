using System.Net;
using System.Net.Http.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.WrapUp;

/// <summary>
/// A wrapped-up Popkin is read-only (L2-045 AC2): every write a member sends is refused with 409
/// `popkin_wrapped_up`, and someone who is not a member is told 404 first, so the refusal never
/// says a Popkin exists (L2-051 AC1).
/// </summary>
public sealed class ReadOnlyPopkinTests
{
    private sealed record Write(string Name, Func<HttpClient, Task<HttpResponseMessage>> Send);

    // Given Lakeside with a message, an experience someone rated and a call under way, wrapped up by its Host,
    // when a member sends each write, then each is 409 popkin_wrapped_up;
    // when someone who is not a member sends it, then 404 popkin_not_found.
    [Fact]
    public async Task Every_write_to_a_wrapped_up_Popkin_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        var experienceId = (await joel.SharedExperienceAsync(lakeside.Id, "Sunrise paddle")).Id();
        await joel.RatedAsync(lakeside.Id, experienceId, 5);
        var callId = (await joel.OnCallAsync(lakeside.Id)).CallId();
        var photo = TestPhotos.WithLocation(MagickFormat.Jpeg, 400, 300);
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        Write[] writes =
        [
            new("send a message", member => member.SendMessageAsync(lakeside.Id, threadId, "Too late")),
            new("add a photo", member => member.AddPhotoAsync(lakeside.Id, photo)),
            new("share an experience", member => member.ShareExperienceAsync(lakeside.Id, "Bonfire")),
            new("edit an experience", member => member.EditExperienceAsync(lakeside.Id, experienceId, "Sunset paddle")),
            new("delete an experience", member => member.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{experienceId}")),
            new("rate an experience", member => member.RateAsync(lakeside.Id, experienceId, 4)),
            new("comment on an experience", member => member.CommentAsync(lakeside.Id, experienceId, "Lovely.")),
            new("start or join a call", member => member.StartOrJoinCallAsync(lakeside.Id)),
            new("change the microphone on a call", member => member.SetCallMediaAsync(lakeside.Id, callId, new { micOn = false })),
            new("wrap up", member => member.WrapUpAsync(lakeside.Id)),
        ];

        foreach (var write in writes)
        {
            var refused = await write.Send(joel);
            Assert.True(refused.StatusCode == HttpStatusCode.Conflict, $"A member could {write.Name}: {(int)refused.StatusCode}");
            await refused.AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");

            var hidden = await write.Send(sam);
            Assert.True(hidden.StatusCode == HttpStatusCode.NotFound, $"Someone who is not a member was answered {(int)hidden.StatusCode} to {write.Name}");
            await hidden.AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        }
    }

    // Given a wrapped-up Popkin, when someone with its invite link joins, then 409 popkin_wrapped_up (L2-045 AC2).
    [Fact]
    public async Task Nobody_joins_a_Popkin_its_Host_wrapped_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        await (await sam.JoinAsync(lakeside.Code, "Sam O")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
    }

    // Given a wrapped-up Popkin with a message a member has not read,
    // when they read the thread and mark it read, then both work: reading adds nothing (L2-045 AC1).
    [Fact]
    public async Task A_member_still_reads_and_marks_read()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel F", "(415) 555-0123");
        var threadId = await joel.EveryoneThreadIdAsync(lakeside.Id);
        var message = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Last one out, lock the cabin.");
        await lakeside.Host.WrappedUpAsync(lakeside.Id);

        var page = await joel.MessagesAsync(lakeside.Id, threadId);
        var marked = await joel.PutAsJsonAsync($"/api/popkins/{lakeside.Id}/threads/{threadId}/read", new { lastReadMessageId = message.Id() });

        Assert.Contains("Last one out, lock the cabin.", page.Texts());
        Assert.True(marked.IsSuccessStatusCode, $"Marking read answered {(int)marked.StatusCode}");
        Assert.Equal(0, (await joel.EveryoneThreadAsync(lakeside.Id)).GetProperty("unreadCount").GetInt32());
    }
}
