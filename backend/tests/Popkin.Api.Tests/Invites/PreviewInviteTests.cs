using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Invites;

/// <summary>GET /api/invites/{code} (L2-012, L2-016, L2-051 AC5, L2-053 AC3).</summary>
public sealed class PreviewInviteTests
{
    private static readonly string[] Colours = ["Coral", "Teal", "Sky", "Berry", "Leaf", "Plum", "Amber"];

    [Fact]
    public async Task A_visitor_sees_who_invited_them_the_Popkin_its_people_and_when_it_wraps_up()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var response = await api.CreateBrowserClient().GetAsync($"/api/invites/{lakeside.Code}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Open", body.GetProperty("state").GetString());
        Assert.Equal("Lakeside Weekend", body.GetProperty("name").GetString());
        Assert.Equal("🏕️", body.GetProperty("emoji").GetString());
        Assert.Equal("Teal", body.GetProperty("colour").GetString());
        Assert.Equal(1, body.GetProperty("memberCount").GetInt32());
        Assert.Equal(lakeside.EndsAt, body.GetProperty("endsAt").GetDateTimeOffset());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("wrappedUpAt").ValueKind);
        var inviter = body.GetProperty("inviter");
        Assert.Equal("Mara", inviter.GetProperty("firstName").GetString());
        Assert.Equal("MO", inviter.GetProperty("avatar").GetProperty("initials").GetString());
        var avatar = Assert.Single(body.GetProperty("avatars").EnumerateArray());
        Assert.Equal("MO", avatar.GetProperty("initials").GetString());
        Assert.Contains(avatar.GetProperty("accent").GetString(), Colours);
        Assert.Equal(JsonValueKind.Null, avatar.GetProperty("photoUrl").ValueKind);
        Assert.False(body.GetProperty("viewer").GetProperty("isMember").GetBoolean());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("viewer").GetProperty("popkinId").ValueKind);
    }

    [Fact]
    public async Task A_Popkin_with_no_end_has_no_end_time()
    {
        using var api = new ApiFactory();
        var crew = await api.StartLakesideAsync(length: "KeepItGoing");

        var body = await api.CreateBrowserClient().GetFromJsonAsync<JsonElement>($"/api/invites/{crew.Code}");

        Assert.Equal(JsonValueKind.Null, body.GetProperty("endsAt").ValueKind);
    }

    [Fact]
    public async Task Someone_who_is_not_a_member_learns_only_what_the_invite_screen_shows()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var walt = api.CreateBrowserClient();
        await walt.SignUpAsync(api, "Walt Brennan", "(415) 555-0177");

        foreach (var client in new[] { api.CreateBrowserClient(), walt })
        {
            var text = await client.GetStringAsync($"/api/invites/{lakeside.Code}");
            var body = JsonDocument.Parse(text).RootElement;

            Assert.Equal(
                ["avatars", "colour", "emoji", "endsAt", "inviter", "memberCount", "name", "state", "viewer", "wrappedUpAt"],
                body.EnumerateObject().Select(p => p.Name).Order());
            Assert.Equal(["avatar", "firstName"], body.GetProperty("inviter").EnumerateObject().Select(p => p.Name).Order());
            Assert.All(
                body.GetProperty("avatars").EnumerateArray().Append(body.GetProperty("inviter").GetProperty("avatar")),
                a => Assert.Equal(["accent", "initials", "photoUrl"], a.EnumerateObject().Select(p => p.Name).Order()));
            // No last name, no contact detail and no id of the Popkin or of a person.
            Assert.DoesNotContain("Okafor", text);
            Assert.DoesNotContain("555", text);
            Assert.DoesNotContain(lakeside.Id.ToString(), text);
            Assert.DoesNotContain(lakeside.HostPersonId.ToString(), text);
        }
    }

    [Fact]
    public async Task The_colour_of_a_person_without_a_photo_stays_the_same()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var client = api.CreateBrowserClient();

        var first = await client.GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");
        var second = await client.GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");

        Assert.Equal(
            first.GetProperty("inviter").GetProperty("avatar").GetProperty("accent").GetString(),
            second.GetProperty("avatars")[0].GetProperty("accent").GetString());
    }

    [Fact]
    public async Task A_member_is_told_they_belong_and_which_Popkin_it_is()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();

        var body = await lakeside.Host.GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");

        Assert.True(body.GetProperty("viewer").GetProperty("isMember").GetBoolean());
        Assert.Equal(lakeside.Id, body.GetProperty("viewer").GetProperty("popkinId").GetGuid());
    }

    [Fact]
    public async Task A_wrapped_up_Popkin_says_so_and_when()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        await api.WrapUpAsync(lakeside.Id);

        var body = await api.CreateBrowserClient().GetFromJsonAsync<JsonElement>($"/api/invites/{lakeside.Code}");

        Assert.Equal("WrappedUp", body.GetProperty("state").GetString());
        Assert.Equal(api.Clock.GetUtcNow(), body.GetProperty("wrappedUpAt").GetDateTimeOffset());
        Assert.Equal("Lakeside Weekend", body.GetProperty("name").GetString());
        Assert.Equal(1, body.GetProperty("memberCount").GetInt32());
        Assert.Equal("Mara", body.GetProperty("inviter").GetProperty("firstName").GetString());
    }

    [Fact]
    public async Task A_code_that_matches_no_Popkin_is_not_found()
    {
        using var api = new ApiFactory();
        await api.StartLakesideAsync();

        var response = await api.CreateBrowserClient().GetAsync("/api/invites/nosuchcode");

        await response.AssertProblem(HttpStatusCode.NotFound, "invite_not_found");
    }

    [Fact]
    public async Task The_twenty_first_code_tried_from_one_address_within_ten_minutes_is_refused()
    {
        using var api = new ApiFactory();
        var client = api.CreateBrowserClient();
        for (var i = 0; i < 20; i++)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/invites/guess{i}")).StatusCode);
        }

        var response = await client.GetAsync("/api/invites/guess20");

        var body = await response.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.True(body.GetProperty("retryAfterSeconds").GetInt32() > 0);
    }
}
