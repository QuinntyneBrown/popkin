using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Dispatch;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Digests;

/// <summary>Sent by the Worker every 5 minutes: gathers the digests that are due (digest-emails).</summary>
public sealed record SendDigestsCommand : IRequest<int>;

/// <summary>
/// From 6 pm where each person is, gathers the changes held for their digest into one email, once
/// a day (on Sunday for the weekly). The dispatcher sends it like any other email: the rules read
/// again, quiet hours, a pause, retries, and nothing sent when nothing is left (L2-165, L2-161 AC4,
/// L2-175 AC3). Saves after each person. Answers the digests gathered.
/// </summary>
public sealed class SendDigestsCommandHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<SendDigestsCommand, int>
{
    public async Task<int> Handle(SendDigestsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var people = await db.NotificationDeliveries
            .Where(d => d.Status == NotificationDeliveryStatus.AwaitingDigest && d.Channel == NotificationChannel.Email)
            .Select(d => d.PersonId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var gathered = 0;
        foreach (var person in people)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            if (await GatherAsync(person, now, cancellationToken))
            {
                gathered++;
            }
        }

        return gathered;
    }

    private async Task<bool> GatherAsync(Guid person, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var preferences = await db.NotificationPreferences.AsNoTracking().FirstOrDefaultAsync(p => p.PersonId == person, cancellationToken);
        var defaultFrequency = (await NotificationPlatformRow.ReadAsync(db, cancellationToken)).DefaultFrequency;
        var frequency = new EffectiveNotificationSettings(preferences, [], defaultFrequency).Frequency;
        var local = TimeZoneInfo.ConvertTime(now, LocalClock.ZoneOf(preferences?.TimeZone));
        if (!DigestRules.IsDue(frequency, local))
        {
            return false;
        }

        // Once a day: a second tick, or a frequency changed the same day, finds the key (L2-175 AC3).
        var key = $"digest:{person}:{local:yyyy-MM-dd}";
        if (await db.OutgoingEmails.AnyAsync(e => e.DedupKey == key, cancellationToken))
        {
            return false;
        }

        var kind = DigestRules.KindOf(frequency);
        var previous = await db.OutgoingEmails
            .Where(e => e.PersonId == person && (e.Kind == NotificationEmailKind.DailyDigest || e.Kind == NotificationEmailKind.WeeklyDigest))
            .MaxAsync(e => (DateTimeOffset?)e.OpenedAt, cancellationToken);
        var from = DigestRules.PeriodStart(previous, now, kind == NotificationEmailKind.WeeklyDigest);
        var held = await db.NotificationDeliveries
            .Where(d => d.PersonId == person && d.Status == NotificationDeliveryStatus.AwaitingDigest && d.Channel == NotificationChannel.Email)
            .Join(db.NotificationEvents, d => d.EventId, e => e.Id, (d, e) => new { Delivery = d, e.OccurredAt })
            .ToListAsync(cancellationToken);
        var email = OutgoingEmail.Due(person, kind, popkinId: null, key, now, now);
        var inPeriod = 0;
        foreach (var x in held)
        {
            if (x.OccurredAt >= from)
            {
                x.Delivery.Gather(email.Id, now);
                inPeriod++;
            }
            else
            {
                // Older than the period (a frequency changed since): too late to be news.
                x.Delivery.Drop();
            }
        }

        if (inPeriod > 0)
        {
            db.OutgoingEmails.Add(email);
        }

        await db.SaveChangesAsync(cancellationToken);
        return inPeriod > 0;
    }
}
