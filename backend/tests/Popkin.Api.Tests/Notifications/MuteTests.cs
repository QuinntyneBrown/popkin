using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Notifications;

/// <summary>Muting a person (mute-people; L2-160).</summary>
public sealed class MuteTests
{
    private static async Task<JsonElement[]> CandidatesAsync(HttpClient member, string q = "") =>
        (await member.GetFromJsonAsync<JsonElement>($"/api/me/notifications/mute-candidates?q={Uri.EscapeDataString(q)}"))
            .EnumerateArray().ToArray();

    private static async Task<JsonElement[]> MutedAsync(HttpClient member) =>
        (await member.GetFromJsonAsync<JsonElement>("/api/me/notifications")).GetProperty("muted").EnumerateArray().ToArray();

    private static Task<HttpResponseMessage> MuteAsync(HttpClient member, Guid membershipId) =>
        member.PostAsJsonAsync("/api/me/notifications/mutes", new { membershipId });

    // Candidates are the people Ruth shares an active Popkin with, matched anywhere in the name
    // ignoring case and accents; Ruth, the muted and people of a wrapped-up Popkin are left out
    // (AC2).
    [Fact]
    public async Task Candidates_are_people_in_shared_active_popkins()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joël Brennan", "(415) 555-0123");
        await api.JoinedAsync(lakeside.Code, "Ben Okafor", "(415) 555-0177");
        // Ruth and Theo share only a wrapped-up Popkin.
        var other = await api.StartPopkinAsync("Theo Grant", "(415) 555-0188", "Old Trip");
        (await ruth.JoinAsync(other.Code, "Ruth Lindqvist")).EnsureSuccessStatusCode();
        await other.Host.WrappedUpAsync(other.Id);

        var everyone = await CandidatesAsync(ruth);
        var joels = await CandidatesAsync(ruth, "JOEL");
        (await MuteAsync(ruth, await joel.MembershipIdAsync(lakeside.Id))).EnsureSuccessStatusCode();
        var afterMuting = await CandidatesAsync(ruth);

        Assert.Equal(["Ben Okafor", "Joël Brennan", "Mara Okafor"], everyone.Select(c => c.GetProperty("name").GetString()));
        Assert.Equal(["Lakeside Weekend"], everyone[0].GetProperty("sharedPopkins").EnumerateArray().Select(p => p.GetString()));
        Assert.Equal("Joël Brennan", Assert.Single(joels).GetProperty("name").GetString());
        Assert.DoesNotContain(afterMuting, c => c.GetProperty("name").GetString() == "Joël Brennan");
    }

    // Muting answers the row, a second mute answers the same row, and the list shows it with the
    // Popkins the two share; unmuting removes it (AC1, AC5).
    [Fact]
    public async Task Muting_twice_is_one_mute_and_unmuting_removes_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        var joels = await joel.MembershipIdAsync(lakeside.Id);

        var first = await (await MuteAsync(ruth, joels)).Content.ReadFromJsonAsync<JsonElement>();
        var second = await (await MuteAsync(ruth, joels)).Content.ReadFromJsonAsync<JsonElement>();
        var muted = Assert.Single(await MutedAsync(ruth));
        var unmuted = await ruth.DeleteAsync($"/api/me/notifications/mutes/{first.GetProperty("muteId").GetGuid()}");

        Assert.Equal(first.GetProperty("muteId").GetGuid(), second.GetProperty("muteId").GetGuid());
        Assert.Equal("Joel Brennan", muted.GetProperty("name").GetString());
        Assert.Equal(["Lakeside Weekend"], muted.GetProperty("sharedPopkins").EnumerateArray().Select(p => p.GetString()));
        Assert.Equal(HttpStatusCode.NoContent, unmuted.StatusCode);
        Assert.Empty(await MutedAsync(ruth));
    }

    // Oneself and a stranger cannot be muted, and another's mute cannot be unmuted (AC7).
    [Fact]
    public async Task Oneself_a_stranger_and_another_persons_mute_are_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        var other = await api.StartPopkinAsync("Theo Grant", "(415) 555-0188", "Elsewhere");
        var mute = await (await MuteAsync(ruth, await joel.MembershipIdAsync(lakeside.Id))).Content.ReadFromJsonAsync<JsonElement>();

        await (await MuteAsync(ruth, await ruth.MembershipIdAsync(lakeside.Id))).AssertProblem(HttpStatusCode.NotFound, "person_not_found");
        await (await MuteAsync(ruth, await other.Host.MembershipIdAsync(other.Id))).AssertProblem(HttpStatusCode.NotFound, "person_not_found");
        await (await joel.DeleteAsync($"/api/me/notifications/mutes/{mute.GetProperty("muteId").GetGuid()}"))
            .AssertProblem(HttpStatusCode.NotFound, "mute_not_found");
        await (await ruth.GetAsync($"/api/me/notifications/mute-candidates?q={new string('a', 41)}"))
            .AssertProblem(HttpStatusCode.BadRequest, "invalid_query");
        Assert.Single(await MutedAsync(ruth));
        Assert.Empty(await MutedAsync(joel));
    }

    // When Ruth mutes Joel, then his message, photo and direct message reach her phone no more,
    // and still reach Mara's; after unmuting, the next one does (AC3, AC5).
    [Fact]
    public async Task A_muted_members_posts_send_nothing_until_unmuted()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var everyone = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var ruth = await api.JoinedAsync(lakeside.Code, "Ruth Lindqvist", "(415) 555-0166");
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Brennan", "(415) 555-0123");
        await ruth.AllowsAlertsAsync();
        await lakeside.Host.AllowsAlertsAsync();
        await api.DispatchAsync();
        api.PhoneAlerts.Clear();
        var ruthId = await ruth.PersonIdAsync();
        var mute = await (await MuteAsync(ruth, await joel.MembershipIdAsync(lakeside.Id))).Content.ReadFromJsonAsync<JsonElement>();

        await joel.SentMessageAsync(lakeside.Id, everyone, "Leaving at six");
        await joel.AddedPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg));
        var direct = (await joel.DirectThreadAsync(lakeside.Id, await ruth.MembershipIdAsync(lakeside.Id))).Id();
        await joel.SentMessageAsync(lakeside.Id, direct, "Psst");
        await api.DispatchAsync();
        var whileMuted = api.PhoneAlerts.Sent.Where(s => s.PersonId == ruthId).ToList();
        var toMara = api.PhoneAlerts.Sent.Where(s => s.PersonId == lakeside.HostPersonId).Select(s => s.Alert.Body).ToList();
        api.PhoneAlerts.Clear();

        await ruth.DeleteAsync($"/api/me/notifications/mutes/{mute.GetProperty("muteId").GetGuid()}");
        await joel.SentMessageAsync(lakeside.Id, direct, "Still there?");
        await api.DispatchAsync();

        Assert.Empty(whileMuted);
        Assert.Contains("Joel wrote in Everyone", toMara);
        Assert.Equal(["Joel sent you a message"], api.PhoneAlerts.Sent.Where(s => s.PersonId == ruthId).Select(s => s.Alert.Body));
    }
}
