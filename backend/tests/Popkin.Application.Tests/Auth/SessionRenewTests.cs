using Popkin.Domain;

namespace Popkin.Application.Tests.Auth;

// Traces to: L2-176
/// <summary>When a use renews a session (docs/detailed-designs/accounts/sessions), one case per rule.</summary>
public sealed class SessionRenewTests
{
    private static readonly DateTimeOffset SignedIn = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Year = TimeSpan.FromDays(365);

    [Theory]
    // Used an hour or more after the last renewal: it lasts the length from now.
    [InlineData(60, 365, true, 60, 365)]
    [InlineData(300 * 24 * 60, 365, true, 300 * 24 * 60, 365)]
    // Used within the hour: nothing moves, nothing is written.
    [InlineData(59, 365, false, 0, 365)]
    // The length was shortened: it moves back to the shorter length from now (L2-176 AC6).
    [InlineData(1, 7, true, 1, 7)]
    // The length was lengthened: it moves on at once.
    [InlineData(1, 400, true, 1, 400)]
    public void A_use_renews_the_session_by_the_rule(int minutesLater, int lengthDays, bool renewed, int expectedFromMinutes, int expectedDays)
    {
        var session = Session.Start(Guid.NewGuid(), SignedIn, Year);
        var now = SignedIn.AddMinutes(minutesLater);

        Assert.Equal(renewed, session.Renew(now, TimeSpan.FromDays(lengthDays)));
        Assert.Equal(SignedIn.AddMinutes(expectedFromMinutes).AddDays(expectedDays), session.ExpiresAt);
    }

    [Fact]
    public void An_ended_session_is_not_renewed()
    {
        var session = Session.Start(Guid.NewGuid(), SignedIn, Year);

        Assert.False(session.Renew(SignedIn + Year, Year));
        Assert.Equal(SignedIn + Year, session.ExpiresAt);
    }

    [Fact]
    public void A_revoked_session_is_not_renewed()
    {
        var session = Session.Start(Guid.NewGuid(), SignedIn, Year);
        session.Revoke(SignedIn);

        Assert.False(session.Renew(SignedIn.AddDays(1), Year));
        Assert.False(session.IsLive(SignedIn.AddDays(1)));
    }
}
