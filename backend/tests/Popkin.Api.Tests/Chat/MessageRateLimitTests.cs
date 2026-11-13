using System.Net;
using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Chat;

/// <summary>The `messages` limit: 60 messages per person per minute (L2-053 AC2, AC4).</summary>
public sealed class MessageRateLimitTests
{
    // Given a member who has sent 60 messages within a minute,
    // when they send the 61st, then 429 rate_limited says when to try again and nothing is stored;
    // another member is not held back; and once the minute has passed they can send again.
    [Fact]
    public async Task The_61st_message_in_a_minute_is_refused_until_the_minute_has_passed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var threadId = await lakeside.Host.EveryoneThreadIdAsync(lakeside.Id);
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel");
        var before = api.MessageCount();
        for (var number = 1; number <= 60; number++)
        {
            Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, $"Message {number}")).StatusCode);
        }

        api.Clock.Advance(TimeSpan.FromSeconds(40));
        var refused = await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "Message 61");

        var body = await refused.AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.Equal(TimeSpan.FromSeconds(20), refused.Headers.RetryAfter?.Delta);
        Assert.Equal(20, body.GetProperty("retryAfterSeconds").GetInt32());
        Assert.Equal(before + 60, api.MessageCount());
        Assert.Equal(HttpStatusCode.Created, (await joel.SendMessageAsync(lakeside.Id, threadId, "Hi from Joel")).StatusCode);

        api.Clock.Advance(TimeSpan.FromSeconds(19));
        await (await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "Message 61")).AssertProblem(HttpStatusCode.TooManyRequests, "rate_limited");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        Assert.Equal(HttpStatusCode.Created, (await lakeside.Host.SendMessageAsync(lakeside.Id, threadId, "Message 61")).StatusCode);
    }
}
