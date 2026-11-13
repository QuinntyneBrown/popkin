using System.Net;
using ImageMagick;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>DELETE /api/popkins/{popkinId}/experiences/{experienceId}: the sharer deletes their experience, and the Host any (L2-040 AC6).</summary>
public sealed class DeleteExperienceTests
{
    // Given Joel shared an experience with a picture, which Mara rated and commented on,
    // when Joel deletes it,
    // then 204, it is no longer listed or found, its ratings and comments are gone with it, and so are its files;
    // the other experience of the Popkin stays, with its rating.
    [Fact]
    public async Task The_sharer_deletes_their_experience_with_its_ratings_and_its_picture()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var kept = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "La Paloma Taqueria", "Restaurant")).Id();
        await joel.RatedAsync(lakeside.Id, kept, 3);
        var id = (await joel.SharedExperienceAsync(lakeside.Id, "Ridge trail loop", picture: TestPhotos.WithLocation(MagickFormat.Jpeg))).Id();
        await lakeside.Host.RatedAsync(lakeside.Id, id, 5);
        await lakeside.Host.CommentedAsync(lakeside.Id, id, "Steep, and worth it.");
        await joel.RatedAsync(lakeside.Id, id, 4);

        var response = await joel.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(["La Paloma Taqueria"], (await joel.ExperiencesAsync(lakeside.Id)).Titles());
        await (await joel.GetAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
        Assert.Equal(1, RateExperienceTests.RatingCount(api));
        Assert.Empty(api.Photos.Files);
        Assert.Equal(3.0, (await joel.ExperienceAsync(lakeside.Id, kept)).GetProperty("average").GetDouble());
        await (await joel.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.NotFound, "experience_not_found");
    }

    // Given Joel shared an experience in Mara's Popkin, where Dev is a member too,
    // when Dev deletes it, then 403 not_experience_sharer and it stays;
    // when Mara, the Host, deletes it, then 204 and it is gone (L2-040 AC6).
    [Fact]
    public async Task The_Host_deletes_any_experience_and_another_member_none()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var dev = await api.JoinedAsync(lakeside.Code, "Dev Patel", "(415) 555-0124");
        var id = (await joel.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();

        await (await dev.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.Forbidden, "not_experience_sharer");
        Assert.Equal(1, ShareExperienceTests.ExperienceCount(api));
        var response = await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(0, ShareExperienceTests.ExperienceCount(api));
    }

    // Given a signed-in person who is not a member, or no session, when they delete, then 404 popkin_not_found, or 401;
    // given a wrapped-up Popkin, when the sharer deletes, then 409 popkin_wrapped_up; the experience stays (L2-045 AC2).
    [Fact]
    public async Task A_delete_needs_a_member_and_an_active_Popkin()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        var stranger = await api.SignedUpAsync("Sam Ortega", "(415) 555-0177");

        await (await stranger.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.NotFound, "popkin_not_found");
        Assert.Equal(HttpStatusCode.Unauthorized, (await api.CreateBrowserClient().DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).StatusCode);
        await api.WrapUpAsync(lakeside.Id);
        await (await lakeside.Host.DeleteAsync($"/api/popkins/{lakeside.Id}/experiences/{id}")).AssertProblem(HttpStatusCode.Conflict, "popkin_wrapped_up");
        Assert.Equal(1, ShareExperienceTests.ExperienceCount(api));
    }
}
