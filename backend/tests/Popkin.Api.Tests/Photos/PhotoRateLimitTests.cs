using System.Net;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Api.Tests.Support;
using Popkin.Infrastructure.Persistence;

namespace Popkin.Api.Tests.Photos;

/// <summary>The `photos` limit: 60 photos added per person per minute (L2-053 AC4, abuse limits).</summary>
public sealed class PhotoRateLimitTests
{
    // Given a member who has added 60 photos within a minute,
    // when they add the 61st, then 429 rate_limited says when to try again and nothing is stored;
    // another member is not held back; and once the minute has passed they can add again.
    [Fact]
    public async Task The_61st_photo_in_a_minute_is_refused_until_the_minute_has_passed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var file = TestPhotos.WithLocation(MagickFormat.Jpeg, 16, 12);
        for (var number = 1; number <= 60; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.AddPhotoAsync(lakeside.Id, file)).StatusCode);
        }

        api.Clock.Advance(TimeSpan.FromSeconds(40));
        var refused = await lakeside.Host.AddPhotoAsync(lakeside.Id, file);

        var body = await refused.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(TimeSpan.FromSeconds(20), refused.Headers.RetryAfter?.Delta);
        Assert.Equal(20, body.GetProperty("retryAfterSeconds").GetInt32());
        Assert.Equal(60, PhotoCount(api));
        Assert.Equal(180, api.Photos.Files.Count);
        Assert.Equal(HttpStatusCode.Created, (await joel.AddPhotoAsync(lakeside.Id, file)).StatusCode);
        // Reading is not counted: the album is still there for the member who is held back.
        Assert.Equal(HttpStatusCode.OK, (await lakeside.Host.GetAsync($"/api/popkins/{lakeside.Id}/photos")).StatusCode);

        api.Clock.Advance(TimeSpan.FromSeconds(19));
        await (await lakeside.Host.AddPhotoAsync(lakeside.Id, file)).AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.AddPhotoAsync(lakeside.Id, file)).StatusCode);
    }

    // The limit on photos is its own: a member who has sent 60 messages can still add a photo.
    [Fact]
    public async Task Messages_do_not_count_against_photos()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        for (var number = 1; number <= 60; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, $"Message {number}")).StatusCode);
        }

        var response = await lakeside.Host.AddPhotoAsync(lakeside.Id, TestPhotos.WithLocation(MagickFormat.Jpeg, 16, 12));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static int PhotoCount(ApiFactory api)
    {
        using var scope = api.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>().Photos.Count();
    }
}
