using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// POST /api/popkins/{popkinId}/experiences/{experienceId}/done: the member who shared an idea, or
/// the Host, says "We did this", and it becomes something the group did, which members rate
/// (L2-042 AC4, L2-045 AC2, L2-051).
/// </summary>
public sealed class MarkExperienceDoneTests
{
    // Given Joel shared an idea that Dev is keen on,
    // when Joel chooses "We did this",
    // then 200 answers it as something the group did, with no ratings and no keen, ready to rate;
    // Dev can rate it, and it is listed under We did and no longer under Want to do (L2-042 AC4).
    [Fact]
    public async Task The_sharer_says_we_did_this_and_members_can_rate_it()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var want = (await joel.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        await dev.KeenedAsync(lakeside.Id, want);
        Assert.True((await joel.ExperienceAsync(lakeside.Id, want)).GetProperty("canMarkDone").GetBoolean());

        var response = await joel.MarkDoneAsync(lakeside.Id, want);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var done = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Did", done.GetProperty("kind").GetString());
        Assert.Equal(JsonValueKind.Null, done.GetProperty("keen").ValueKind);
        Assert.Equal(0, done.GetProperty("keenCount").GetInt32());
        Assert.Equal(0, done.GetProperty("ratingCount").GetInt32());
        Assert.True(done.GetProperty("canRate").GetBoolean());
        Assert.False(done.GetProperty("canKeen").GetBoolean());
        Assert.False(done.GetProperty("canMarkDone").GetBoolean());
        (await dev.RateAsync(lakeside.Id, want, 5)).EnsureSuccessStatusCode();
        Assert.Equal(["Beach day next summer?"], (await dev.ExperiencesAsync(lakeside.Id, "filter=did")).Titles());
        Assert.Empty((await dev.ExperiencesAsync(lakeside.Id, "filter=want")).Titles());
    }

    // Given an idea Joel shared, when the Host chooses "We did this", then it is done too.
    [Fact]
    public async Task The_Host_says_we_did_this_of_any_idea()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var want = (await joel.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        Assert.True((await lakeside.Host.ExperienceAsync(lakeside.Id, want)).GetProperty("canMarkDone").GetBoolean());

        var response = await lakeside.Host.MarkDoneAsync(lakeside.Id, want);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Did", (await joel.ExperienceAsync(lakeside.Id, want)).GetProperty("kind").GetString());
    }

    // Given an idea Joel shared, when Dev, neither its sharer nor the Host, chooses "We did this",
    // then 403 not_experience_sharer and it is still an idea; Dev is not offered it (L2-051 AC4).
    [Fact]
    public async Task Anyone_else_is_refused()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var want = (await joel.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        Assert.False((await dev.ExperienceAsync(lakeside.Id, want)).GetProperty("canMarkDone").GetBoolean());

        await (await dev.MarkDoneAsync(lakeside.Id, want)).AssertProblem(HttpStatusCode.Forbidden, "not_experience_sharer");

        Assert.Equal("Want", (await dev.ExperienceAsync(lakeside.Id, want)).GetProperty("kind").GetString());
    }

    // Given something the group did, when its sharer says "We did this", then 409 experience_not_wanted;
    // given a stranger, 404 popkin_not_found; an experience that is not there, 404 experience_not_found;
    // given a wrapped-up Popkin, 409 popkin_wrapped_up and nobody is offered it.
    [Fact]
    public async Task We_did_this_is_refused_where_it_does_not_belong()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var want = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Beach day next summer?", "Want")).Id();
        var did = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await lakeside.Host.MarkDoneAsync(lakeside.Id, did)).AssertProblem(HttpStatusCode.Conflict, "experience_not_wanted");
        await (await stranger.MarkDoneAsync(lakeside.Id, want)).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        await (await lakeside.Host.MarkDoneAsync(lakeside.Id, Guid.NewGuid())).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");

        await api.WrapUpAsync(lakeside.Id);

        await (await lakeside.Host.MarkDoneAsync(lakeside.Id, want)).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.False((await lakeside.Host.ExperienceAsync(lakeside.Id, want)).GetProperty("canMarkDone").GetBoolean());
    }
}
