using ImageMagick;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Members;

/// <summary>GET /api/popkins/{popkinId}/members (L2-019 AC6, L2-054 AC2, L2-051 AC1).</summary>
public sealed class MembersTests
{
    private static Task<JsonElement> MembersAsync(HttpClient member, Guid popkinId) =>
        member.GetFromJsonAsync<JsonElement>($"/api/popkins/{popkinId}/members");

    // Given Lakeside Weekend, which Joel joined with a photo before two others joined,
    // when Joel reads its members,
    // then they are the Host first and then in the order they joined, each with a name, an
    // avatar and a role, and Joel is marked as the viewer.
    [Fact]
    public async Task A_member_reads_the_members_with_the_Host_first_then_in_the_order_they_joined()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        api.Clock.Advance(TimeSpan.FromMinutes(1));
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        var joined = await (await joel.JoinAsync(lakeside.Code, "Joel Ferreira", TestPhotos.WithLocation(MagickFormat.Jpeg))).Content.ReadFromJsonAsync<JsonElement>();
        await api.AddMembersAsync(lakeside.Id, "Priya Nair", "Tomas Lindqvist");

        var members = await MembersAsync(joel, lakeside.Id);

        Assert.Equal(
            ["Mara Okafor", "Joel Ferreira", "Priya Nair", "Tomas Lindqvist"],
            members.EnumerateArray().Select(m => m.GetProperty("displayName").GetString()));
        Assert.Equal(["Host", "Member", "Member", "Member"], members.EnumerateArray().Select(m => m.GetProperty("role").GetString()));
        Assert.Equal([false, true, false, false], members.EnumerateArray().Select(m => m.GetProperty("isViewer").GetBoolean()));
        Assert.Equal(joined.GetProperty("membershipId").GetGuid(), members[1].GetProperty("membershipId").GetGuid());
        Assert.Equal("MO", members[0].GetProperty("avatar").GetProperty("initials").GetString());
        Assert.Equal(JsonValueKind.Null, members[0].GetProperty("avatar").GetProperty("photoUrl").ValueKind);
        Assert.Equal(JsonValueKind.String, members[1].GetProperty("avatar").GetProperty("photoUrl").ValueKind);
    }

    // Given members who signed up with a phone number and with an email,
    // when a member reads the members,
    // then each carries a name, an avatar, a role and nothing else: never a contact detail.
    [Fact]
    public async Task A_member_carries_no_phone_number_and_no_email()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.AddMembersAsync(lakeside.Id, "Priya Nair");

        var response = await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/members");
        var json = await response.Content.ReadAsStringAsync();
        var members = JsonSerializer.Deserialize<JsonElement>(json);

        foreach (var member in members.EnumerateArray())
        {
            Assert.Equal(["avatar", "displayName", "isViewer", "membershipId", "role"], member.EnumerateObject().Select(p => p.Name).Order());
            Assert.Equal(["accent", "initials", "photoUrl"], member.GetProperty("avatar").EnumerateObject().Select(p => p.Name).Order());
        }

        Assert.DoesNotContain("phone", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("email", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("@", json);
    }

    // Given a member who has left,
    // when the members are read, then they are not among them;
    // when they ask for the members themselves, then the Popkin is not there for them.
    [Fact]
    public async Task A_member_who_left_is_not_listed_and_no_longer_reads_the_members()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel Ferreira");
        await api.LeaveAsync(lakeside.Id, "Joel Ferreira");

        var members = await MembersAsync(lakeside.Host, lakeside.Id);

        Assert.Equal(["Mara Okafor"], members.EnumerateArray().Select(m => m.GetProperty("displayName").GetString()));
        await (await joel.GetAsync($"/api/popkins/{lakeside.Id}/members")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
    }

    // Given a signed-in person who is not a member,
    // when they ask for the members of a Popkin, or of one that does not exist,
    // then both answer 404 popkin_not_found, and no session answers 401;
    // a wrapped-up Popkin still reads for its members.
    [Fact]
    public async Task Only_a_member_reads_the_members()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.GetAsync($"/api/popkins/{lakeside.Id}/members")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await stranger.GetAsync($"/api/popkins/{Guid.NewGuid()}/members")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().GetAsync($"/api/popkins/{lakeside.Id}/members")).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        Assert.Equal(1, (await MembersAsync(lakeside.Host, lakeside.Id)).GetArrayLength());
    }
}
