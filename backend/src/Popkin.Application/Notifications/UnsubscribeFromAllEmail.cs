using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Emails;
using Popkin.Application.Notifications.Settings;
using Popkin.Application.Telemetry;

namespace Popkin.Application.Notifications;

/// <summary>What an unsubscribe link did (unsubscribe design, L2-168).</summary>
public enum UnsubscribeOutcome
{
    Unsubscribed,
    AlreadyOff,
    Expired,
}

/// <summary>
/// "Unsubscribe from all email", with no session: the token names the person. It turns "Email"
/// off as the switch does, keeping every kind's choice (L2-156 AC3); a token that is forged,
/// altered, past its 90 days or for an account that is gone is refused the same way (L2-168 AC5);
/// a second use changes nothing (AC6).
/// </summary>
public sealed record UnsubscribeFromAllEmailCommand(string? Token) : IRequest<UnsubscribeOutcome>;

public sealed class UnsubscribeFromAllEmailCommandHandler(IAppDbContext db, IUnsubscribeTokens tokens, TimeProvider clock, PopkinMetrics metrics)
    : IRequestHandler<UnsubscribeFromAllEmailCommand, UnsubscribeOutcome>
{
    public async Task<UnsubscribeOutcome> Handle(UnsubscribeFromAllEmailCommand request, CancellationToken cancellationToken)
    {
        var outcome = await UnsubscribeAsync(request.Token, cancellationToken);
        metrics.Unsubscribe(outcome switch
        {
            UnsubscribeOutcome.Unsubscribed => "unsubscribed",
            UnsubscribeOutcome.AlreadyOff => "already",
            _ => "expired",
        });
        return outcome;
    }

    private async Task<UnsubscribeOutcome> UnsubscribeAsync(string? token, CancellationToken cancellationToken)
    {
        if (tokens.Read(token) is not { } personId
            || !await db.People.AnyAsync(p => p.Id == personId && p.DeletedAt == null, cancellationToken))
        {
            return UnsubscribeOutcome.Expired;
        }

        var preferences = await db.PreferencesOfAsync(personId, cancellationToken);
        if (!preferences.EmailOn)
        {
            return UnsubscribeOutcome.AlreadyOff;
        }

        preferences.TurnEmail(false, clock.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);
        return UnsubscribeOutcome.Unsubscribed;
    }
}
