using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// PUT and DELETE /api/popkins/{popkinId}/experiences/{experienceId}/keen: a member says they are
/// keen on something the group wants to do, or takes it back (L2-042 AC1 to AC3, L2-045 AC2,
/// L2-051).
/// </summary>
public sealed class SayKeenTests
{
    // Given something the group wants to do that nobody is keen on,
    // when it opens, then it says nobody is keen yet and that the member may say they are,
    // and something the group did says nothing of keen (L2-042 AC1).
    [Fact]
    public async Task An_idea_says_who_is_keen_and_something_done_does_not()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        var did = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        var idea = await lakeside.Host.ExperienceAsync(lakeside.Id, want);

        Assert.Equal((0, false, 0), Keen(idea.GetProperty("keen")));
        Assert.Equal(["count", "members", "mine"], idea.GetProperty("keen").EnumerateObject().Select(p => p.Name).Order());
        Assert.True(idea.GetProperty("canKeen").GetBoolean());
        var done = await lakeside.Host.ExperienceAsync(lakeside.Id, did);
        Assert.Equal(JsonValueKind.Null, done.GetProperty("keen").ValueKind);
        Assert.False(done.GetProperty("canKeen").GetBoolean());
    }

    // Given an idea, when a member chooses "I'm keen", then 200 answers that they are keen and the
    // count is one more; the idea and its card say so, and another member sees the count and who is
    // keen but is not keen themselves (L2-042 AC2).
    [Fact]
    public async Task A_member_says_they_are_keen()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();

        var response = await joel.KeenAsync(lakeside.Id, want);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var keen = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((1, true, 1), Keen(keen));
        var member = keen.GetProperty("members")[0];
        Assert.Equal("Joel", member.GetProperty("firstName").GetString());
        Assert.Equal(["avatar", "firstName", "membershipId"], member.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal((1, true, 1), Keen((await joel.ExperienceAsync(lakeside.Id, want)).GetProperty("keen")));
        var mara = await lakeside.Host.ExperienceAsync(lakeside.Id, want);
        Assert.Equal((1, false, 1), Keen(mara.GetProperty("keen")));
        Assert.Equal(1, mara.GetProperty("keenCount").GetInt32());
        Assert.Equal(1, (await lakeside.Host.ExperiencesAsync(lakeside.Id, "filter=want"))[0].GetProperty("keenCount").GetInt32());
    }

    // Given a member who is keen, when they say so again, then nothing changes; when they choose
    // "You're keen", then they are no longer keen and the count is one less, and taking it back again
    // changes nothing (L2-042 AC3).
    [Fact]
    public async Task Saying_it_twice_changes_nothing_and_a_member_takes_it_back()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        await lakeside.Host.KeenedAsync(lakeside.Id, want);
        await joel.KeenedAsync(lakeside.Id, want);

        Assert.Equal((2, true, 2), Keen(await joel.KeenedAsync(lakeside.Id, want)));

        var response = await joel.NotKeenAsync(lakeside.Id, want);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal((1, false, 1), Keen(await response.Content.ReadFromJsonAsync<JsonElement>()));
        var again = await joel.NotKeenAsync(lakeside.Id, want);
        Assert.Equal((1, false, 1), Keen(await again.Content.ReadFromJsonAsync<JsonElement>()));
        Assert.Equal(1, (await joel.ExperiencesAsync(lakeside.Id))[0].GetProperty("keenCount").GetInt32());
    }

    // Given six members keen, one after another, when the idea opens,
    // then the count is six and the members are the first four who said so, the earliest first.
    [Fact]
    public async Task The_members_shown_are_the_first_four_who_are_keen()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        string[] names = ["Ellie Brennan", "Walt Brennan", "Dev Patel", "Ruth Lindqvist", "Joel Ferreira", "Sam Ortega"];
        for (var i = 0; i < names.Length; i++)
        {
            var member = await api.JoinedAsync(lakeside.Code, names[i], $"(415) 555-01{40 + i}");
            api.Clock.Advance(TimeSpan.FromMinutes(1));
            await member.KeenedAsync(lakeside.Id, want);
        }

        var keen = (await lakeside.Host.ExperienceAsync(lakeside.Id, want)).GetProperty("keen");

        Assert.Equal(6, keen.GetProperty("count").GetInt32());
        Assert.Equal(["Ellie", "Walt", "Dev", "Ruth"], keen.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("firstName").GetString()));
    }

    // Given something the group did, when a member says they are keen, then 409 experience_not_wanted;
    // given a wrapped-up Popkin, then 409 popkin_wrapped_up and the idea can no longer be keened;
    // given a stranger, 404 popkin_not_found; an experience that is not there, 404 experience_not_found;
    // no session, 401.
    [Fact]
    public async Task Keen_is_refused_where_it_does_not_belong()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        var did = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await lakeside.Host.KeenAsync(lakeside.Id, did)).AssertProblem(HttpStatusCode.Conflict, "experience_not_wanted");
        await (await lakeside.Host.NotKeenAsync(lakeside.Id, did)).AssertProblem(HttpStatusCode.Conflict, "experience_not_wanted");
        await (await stranger.KeenAsync(lakeside.Id, want)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.KeenAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().PutAsync($"/api/popkins/{lakeside.Id}/experiences/{want}/keen", null)).StatusCode);

        await api.WrapUpAsync(lakeside.Id);

        await (await lakeside.Host.KeenAsync(lakeside.Id, want)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.False((await lakeside.Host.ExperienceAsync(lakeside.Id, want)).GetProperty("canKeen").GetBoolean());
    }

    private static (int Count, bool Mine, int Members) Keen(JsonElement keen) =>
        (keen.GetProperty("count").GetInt32(), keen.GetProperty("mine").GetBoolean(), keen.GetProperty("members").GetArrayLength());
}
