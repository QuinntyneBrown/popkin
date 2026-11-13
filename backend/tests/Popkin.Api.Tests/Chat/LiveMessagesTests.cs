using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>`PopkinHub` at /hubs/popkin and the `MessageAdded` event (L2-027 AC1, L2-050 AC4, L2-051).</summary>
public sealed class LiveMessagesTests
{
    // Given two members with Popkin open,
    // when one posts a message,
    // then the other's connection receives MessageAdded with that message within 1 second,
    // and so does the sender's own.
    [Fact]
    public async Task A_message_reaches_the_other_members_as_it_is_sent()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var sent = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Who's bringing the firewood?");

        var received = await joelHub.WaitForAsync("MessageAdded", timeout: TimeSpan.FromSeconds(1));
        // The event carries the message exactly as the sender was answered.
        Assert.Equal(sent.GetRawText(), received.Arguments[0].GetRawText());
        Assert.Equal(sent.GetProperty("id").GetGuid(), received.Arguments[0].GetProperty("id").GetGuid());
        Assert.Equal("Member", received.Arguments[0].GetProperty("kind").GetString());
        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == sent.GetProperty("id").GetGuid());
    }

    // Given a member whose message was stored,
    // when they send it again under the same client message id,
    // then no second MessageAdded is sent: the next event the others receive is the next message.
    [Fact]
    public async Task A_repeated_send_tells_nobody_again()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        await using var hub = await api.CreateHubConnectionAsync(lakeside.Host);
        var clientMessageId = Guid.NewGuid();
        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "On my way", clientMessageId);

        await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "On my way", clientMessageId);
        var next = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Nearly there");

        await hub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == next.GetProperty("id").GetGuid());
        Assert.Equal(["On my way", "Nearly there"], hub.ReceivedNamed("MessageAdded").Select(e => e.Arguments[0].GetProperty("text").GetString()));
    }

    // Given a signed-in person with Popkin open who is not a member of Lakeside,
    // when a message is posted in Lakeside and then one in their own Popkin,
    // then they receive their own Popkin's message and nothing of Lakeside's (L2-051).
    [Fact]
    public async Task A_person_who_is_not_a_member_receives_nothing_from_a_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var sam = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await sam.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var bookClubThreadId = await sam.EveryoneThreadIdAsync(bookClubId);
        await using var samHub = await api.CreateHubConnectionAsync(sam);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);

        var lakesideMessage = await lakeside.Host.SentMessageAsync(lakeside.Id, threadId, "Members only");
        await maraHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("id").GetGuid() == lakesideMessage.GetProperty("id").GetGuid());
        await sam.SentMessageAsync(bookClubId, bookClubThreadId, "Chapter four tonight");

        await samHub.WaitForAsync("MessageAdded", e => e.Arguments[0].GetProperty("text").GetString() == "Chapter four tonight");
        Assert.Equal(["Chapter four tonight"], samHub.ReceivedNamed("MessageAdded").Select(e => e.Arguments[0].GetProperty("text").GetString()));
        Assert.DoesNotContain(maraHub.Received, e => e.Name == "MessageAdded" && e.Arguments[0].GetProperty("text").GetString() == "Chapter four tonight");
    }

    // Given no session, when a client connects to the hub, then it is refused with 401 (L2-050 AC4).
    [Fact]
    public async Task The_hub_refuses_a_connection_without_a_session()
    {
        using var api = new ApiFactory();

        var refused = await Assert.ThrowsAsync<HttpRequestException>(() => api.CreateHubConnectionAsync(api.CreateBrowserClient()));

        Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
    }

    // Given a session, when another site opens the hub, by any method, then 403 cross_site_request (L2-050 AC2).
    [Fact]
    public async Task The_hub_accepts_a_connection_from_the_apps_own_origin_only()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var negotiated = await Assert.ThrowsAsync<HttpRequestException>(() => api.CreateHubConnectionAsync(lakeside.Host, site: "cross-site"));
        using var socket = new HttpRequestMessage(HttpMethod.Get, "/hubs/popkin");
        socket.Headers.Add("Origin", "https://evil.example");
        lakeside.Host.DefaultRequestHeaders.Remove("Sec-Fetch-Site");
        var opened = await lakeside.Host.SendAsync(socket);

        Assert.Equal(HttpStatusCode.Forbidden, negotiated.StatusCode);
        await opened.AssertProblem(HttpStatusCode.Forbidden, "cross_site_request");
    }
}
