using Popkin.Api.Tests.Support;

namespace Popkin.Api.Tests.Calls;

/// <summary>The call-signal limit: 600 signals per hub connection per minute (L2-053, abuse-limits).</summary>
public sealed class CallSignalRateLimitTests
{
    // Given a participant whose connection has sent 600 signals within a minute,
    // when it sends the 601st, then the hub refuses it with rate_limited and relays nothing:
    // a signal arrives or fails, and is never dropped unseen. Another connection is not held
    // back, and once the minute has passed the first can signal again.
    [Fact]
    public async Task The_601st_signal_of_a_connection_in_a_minute_is_refused_until_the_minute_has_passed()
    {
        using var api = new ApiFactory();
        var lakeside = await api.StartLakesideAsync();
        var joel = await api.SignedUpAsync("Joel Ferreira", "(415) 555-0123");
        await joel.JoinAsync(lakeside.Code, "Joel F");
        await using var maraHub = await api.CreateHubConnectionAsync(lakeside.Host);
        await using var joelHub = await api.CreateHubConnectionAsync(joel);
        var started = await lakeside.Host.OnCallAsync(lakeside.Id);
        var joelId = (await joel.OnCallAsync(lakeside.Id)).ViewerMembershipId();
        await maraHub.JoinCallAsync(started.CallId());
        await joelHub.JoinCallAsync(started.CallId());
        for (var number = 1; number <= 600; number++)
        {
            await maraHub.SendSignalAsync(started.CallId(), joelId, "candidate", $"candidate {number}");
        }

        api.Clock.Advance(TimeSpan.FromSeconds(40));
        await CallExtensions.AssertRefusedAsync(() => maraHub.SendSignalAsync(started.CallId(), joelId, "candidate", "candidate 601"), "rate_limited");

        await joelHub.SendSignalAsync(started.CallId(), started.ViewerMembershipId(), "candidate", "from Joel");
        await maraHub.WaitForAsync("Signal");
        api.Clock.Advance(TimeSpan.FromSeconds(19));
        await CallExtensions.AssertRefusedAsync(() => maraHub.SendSignalAsync(started.CallId(), joelId, "candidate", "candidate 601"), "rate_limited");
        api.Clock.Advance(TimeSpan.FromSeconds(1));
        await maraHub.SendSignalAsync(started.CallId(), joelId, "candidate", "candidate 601");

        await joelHub.WaitForAsync("Signal", e => e.Arguments[2].GetProperty("payload").GetString() == "candidate 601");
        // Every signal that was accepted arrived once, in order; the refused ones never did.
        Assert.Equal(
            Enumerable.Range(1, 601).Select(number => $"candidate {number}"),
            joelHub.ReceivedNamed("Signal").Select(e => e.Arguments[2].GetProperty("payload").GetString()));
    }
}
