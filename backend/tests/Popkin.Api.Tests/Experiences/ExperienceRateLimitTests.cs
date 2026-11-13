using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Experiences;

/// <summary>
/// The limits experiences are under (L2-053 AC4, abuse limits): sharing and editing count with
/// the photos a person adds, 60 a minute; rating and commenting count with the messages they
/// send, 60 a minute.
/// </summary>
public sealed class ExperienceRateLimitTests
{
    // Given a member who has shared 60 experiences within a minute,
    // when they share the 61st, or edit one, then 429 rate_limited says when to try again and nothing is saved;
    // another member is not held back, reading and rating are not counted, and after the minute they share again.
    [Fact]
    public async Task The_61st_experience_in_a_minute_is_refused_until_the_minute_has_passed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.JoinedAsync(lakeside.Code, "Joel Ferreira", "(415) 555-0123");
        var id = Guid.Empty;
        for (var number = 1; number <= 60; number++)
        {
            id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, $"Experience {number}")).Id();
        }

        api.Clock.Advance(TimeSpan.FromSeconds(40));
        var refused = await lakeside.Host.ShareExperienceAsync(lakeside.Id, "One too many");

        var body = await refused.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(TimeSpan.FromSeconds(20), refused.Headers.RetryAfter?.Delta);
        Assert.Equal(20, body.GetProperty("retryAfterSeconds").GetInt32());
        await (await lakeside.Host.EditExperienceAsync(lakeside.Id, id, "Renamed")).AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(60, ShareExperienceTests.ExperienceCount(api));
        Assert.Equal(HttpStatusCode.Created, (await joel.ShareExperienceAsync(lakeside.Id, "Joel's")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/experiences")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.RateAsync(lakeside.Id, id, 5)).StatusCode);

        api.Clock.Advance(TimeSpan.FromSeconds(20));
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.ShareExperienceAsync(lakeside.Id, "After the minute")).StatusCode);
    }

    // Given a member who has rated and commented 60 times within a minute,
    // when they rate or comment again, then 429 rate_limited and their rating stays as it was;
    // sharing is not held back, and after the minute they rate again.
    [Fact]
    public async Task The_61st_rating_or_comment_in_a_minute_is_refused_until_the_minute_has_passed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var id = (await lakeside.Host.SharedExperienceAsync(lakeside.Id, "Ridge trail loop")).Id();
        for (var number = 1; number <= 30; number++)
        {
            Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.RateAsync(lakeside.Id, id, 4)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.CommentAsync(lakeside.Id, id, $"Comment {number}")).StatusCode);
        }

        var refusedRating = await lakeside.Host.RateAsync(lakeside.Id, id, 1);
        var refusedComment = await lakeside.Host.CommentAsync(lakeside.Id, id, "One too many");

        var body = await refusedRating.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(60, body.GetProperty("retryAfterSeconds").GetInt32());
        await refusedComment.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        var detail = await lakeside.Host.ExperienceAsync(lakeside.Id, id);
        Assert.Equal(4, detail.GetProperty("myRating").GetProperty("stars").GetInt32());
        Assert.Equal("Comment 30", detail.GetProperty("myRating").GetProperty("comment").GetString());
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.ShareExperienceAsync(lakeside.Id, "Another")).StatusCode);

        api.Clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.RateAsync(lakeside.Id, id, 1)).StatusCode);
    }
}
