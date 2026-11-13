using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;
using Popkin.Application.Realtime;

namespace Popkin.Api.Tests.Chat;

/// <summary>"Here now": GET /api/popkins/{popkinId}/presence and the `PresenceChanged` event (live-messages).</summary>
public sealed class PresenceTests
{
    private static Task<JsonElement> PresenceAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/presence");

    private static List<string?> Names(JsonElement presence) =>
        presence.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("displayName").GetString()).ToList();

    // Given the Host with Popkin open,
    // when a second member connects,
    // then both are told the new count with a higher version, the thread header says two are
    // here now, and the presence read lists both by the names they go by, the Host first.
    [Fact]
    public async Task Here_now_rises_when_a_second_member_connects()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var alone = await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1);

        await using var joelHub = await api.CreateHubConnectionAsync(joel);

        var together = await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 2);
        Assert.Equal(lakeside.Id, together.Arguments[0].GetGuid());
        Assert.True(together.Arguments[1].GetInt64() > alone.Arguments[1].GetInt64());
        // The member who connected is told of their own arrival too.
        await joelHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 2);
        var thread = await joel.EveryoneThreadAsync(lakeside.Id);
        Assert.Equal(2, thread.GetProperty("hereNow").GetInt32());
        Assert.Equal(together.Arguments[1].GetInt64(), thread.GetProperty("presenceVersion").GetInt64());
        var presence = await PresenceAsync(joel, lakeside.Id);
        Assert.Equal(2, presence.GetProperty("hereNow").GetInt32());
        Assert.Equal(together.Arguments[1].GetInt64(), presence.GetProperty("version").GetInt64());
        Assert.Equal(["Mara Okafor", "Joel F"], Names(presence));
        var first = presence.GetProperty("members")[0];
        Assert.Equal(["avatar", "displayName", "membershipId"], first.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("MO", first.GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(
            (await lakeside.Host.EveryoneThreadAsync(lakeside.Id)).GetProperty("viewer").GetProperty("membershipId").GetGuid(),
            first.GetProperty("membershipId").GetGuid());
    }

    // Given a member with Popkin open on two devices,
    // when the second connects, then they still count once and nobody is told of a change.
    [Fact]
    public async Task A_person_with_two_connections_counts_once()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await using var phone = await api.CreateHubConnectionAsync(lakeside.Host);
        await phone.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1);

        await using var laptop = await api.CreateHubConnectionAsync(lakeside.Host);

        var presence = await PresenceAsync(lakeside.Host, lakeside.Id);
        Assert.Equal(1, presence.GetProperty("hereNow").GetInt32());
        Assert.Equal(["Mara Okafor"], Names(presence));
        // A message sent afterwards has arrived on both, so nothing else is still on its way.
        await lakeside.Host.SentMessageAsync(lakeside.Id, await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id), "Testing, testing");
        await phone.WaitForAsync("MessageAdded");
        await laptop.WaitForAsync("MessageAdded");
        Assert.Single(phone.ReceivedNamed("PresenceChanged"));
        Assert.Empty(laptop.ReceivedNamed("PresenceChanged"));
    }

    // Given two members here now,
    // when one closes Popkin, then they still count until 20 seconds have passed without a
    // reconnect; then the other is told the lower count with a higher version and the read lists one.
    [Fact]
    public async Task A_member_who_disconnects_is_gone_only_after_the_20_second_grace()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        var joelHub = await api.CreateHubConnectionAsync(joel);
        var together = await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 2);

        await joelHub.DisposeAsync();
        await api.Requests.WaitForAsync<DisconnectFromHubCommand>();
        api.Clock.Advance(PresenceTracker.Grace - TimeSpan.FromMilliseconds(1));
        var during = await PresenceAsync(lakeside.Host, lakeside.Id);
        api.Clock.Advance(TimeSpan.FromMilliseconds(1));

        Assert.Equal(2, during.GetProperty("hereNow").GetInt32());
        Assert.Equal(["Mara Okafor", "Joel F"], Names(during));
        var gone = await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1 && e.Arguments[1].GetInt64() > together.Arguments[1].GetInt64());
        var after = await PresenceAsync(lakeside.Host, lakeside.Id);
        Assert.Equal(1, after.GetProperty("hereNow").GetInt32());
        Assert.Equal(gone.Arguments[1].GetInt64(), after.GetProperty("version").GetInt64());
        Assert.Equal(["Mara Okafor"], Names(after));
    }

    // Given more than eight members here now, the read names eight, the Host first and then in
    // the order they joined, and still counts them all.
    [Fact]
    public async Task The_presence_read_names_at_most_eight_members_and_counts_them_all()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        string[] names = ["Walt Brennan", "Dev Patel", "Ellie Brennan", "Ruth Lindqvist", "Sam Ortega", "Grace Adeyemi", "Priya Nair", "Noor Haddad", "Tomás Silva"];
        await api.AddMembersAsync(lakeside.Id, names);
        api.ConnectEveryMember(lakeside.Id);

        var presence = await PresenceAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(10, presence.GetProperty("hereNow").GetInt32());
        Assert.Equal(["Mara Okafor", .. names.Take(7)], Names(presence));
    }

    // Presence belongs to the Popkin's members: anyone else gets 404 popkin_not_found, and no
    // PresenceChanged of the Popkin (L2-051).
    [Fact]
    public async Task Only_a_member_reads_who_is_here()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");
        var created = await stranger.PostAsJsonAsync("/api/popkins", new { name = "Book Club", emoji = "📚", colour = "Plum", length = "KeepItGoing" });
        var bookClubId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await using var strangerHub = await api.CreateHubConnectionAsync(stranger);
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await maraHub.WaitForAsync("PresenceChanged", e => e.Arguments[2].GetInt32() == 1);

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/presence")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/presence")).StatusCode);
        Assert.Equal(1, (await PresenceAsync(lakeside.Host, lakeside.Id)).GetProperty("hereNow").GetInt32());
        // Once a later message of their own Popkin has arrived, everything sent before it has too.
        await stranger.SentMessageAsync(bookClubId, await stranger.EveryoneThreadIdAsync(bookClubId), "Chapter four tonight");
        await strangerHub.WaitForAsync("MessageAdded");
        Assert.All(strangerHub.ReceivedNamed("PresenceChanged"), e => Assert.Equal(bookClubId, e.Arguments[0].GetGuid()));
        Assert.All(maraHub.ReceivedNamed("PresenceChanged"), e => Assert.Equal(lakeside.Id, e.Arguments[0].GetGuid()));
    }
}
