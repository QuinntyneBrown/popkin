using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Emails;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>
/// The email side of the dispatcher (deliver-notifications, "Bundles and sending"): places each
/// email change in the person's bundle for the Popkin, or keeps it for the digest, and sends the
/// bundles whose window has ended, each read again first (L2-161 AC3, AC4, AC9; L2-174 AC1).
/// </summary>
public sealed class UpdateEmails(
    IAppDbContext db, PopkinUpdateEmailComposer composer, INotificationEmailRenderer renderer, INotificationEmailSender sender, NotificationLinks links)
{
    /// <summary>The delivery for an email change the rules let through (or held, while email is paused).</summary>
    public async Task<NotificationDelivery> PlaceAsync(
        NotificationEvent notification,
        Guid person,
        NotificationDecision decision,
        NotificationQuestion question,
        NotificationFrequency frequency,
        NotificationPlatform platform,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (frequency != NotificationFrequency.AsItHappens || notification.PopkinId is not { } popkinId
            || await SentTodayAsync(person, question.Zone, now, cancellationToken) >= platform.DailyMost)
        {
            return NotificationDelivery.AwaitingDigest(notification.Id, person, now);
        }

        var bundle = db.OutgoingEmails.Local.FirstOrDefault(Open)
            ?? await db.OutgoingEmails.FirstOrDefaultAsync(
                e => e.PersonId == person && e.PopkinId == popkinId && e.Kind == NotificationEmailKind.Update && e.Status == OutgoingEmailStatus.Open,
                cancellationToken);
        if (bundle is null)
        {
            var windowEnds = now.AddMinutes(platform.BundlingMinutes);
            bundle = OutgoingEmail.OpenUpdate(person, popkinId, now, decision.At > windowEnds ? decision.At : windowEnds);
            db.OutgoingEmails.Add(bundle);
        }

        return NotificationDelivery.Bundled(notification.Id, person, bundle.Id, bundle.SendAfter);

        bool Open(OutgoingEmail e) =>
            e.PersonId == person && e.PopkinId == popkinId && e.Kind == NotificationEmailKind.Update && e.Status == OutgoingEmailStatus.Open;
    }

    /// <summary>Activity emails sent to the person since midnight where they are (L2-161 AC4).</summary>
    private async Task<int> SentTodayAsync(Guid person, TimeZoneInfo zone, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var local = TimeZoneInfo.ConvertTime(now, zone);
        var midnight = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(local.Date, zone), TimeSpan.Zero);
        return await db.OutgoingEmails.CountAsync(
            e => e.PersonId == person && e.Kind == NotificationEmailKind.Update && e.SentAt != null && e.SentAt >= midnight,
            cancellationToken);
    }

    /// <summary>Sends each update whose window has ended; each is saved on its own.</summary>
    public async Task<int> SendDueAsync(
        Func<NotificationEvent, Guid, NotificationChannel, CancellationToken, Task<NotificationQuestion>> ask,
        NotificationPlatform platform,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var due = await db.OutgoingEmails
            .Where(e => e.Kind == NotificationEmailKind.Update
                && ((e.Status == OutgoingEmailStatus.Open || e.Status == OutgoingEmailStatus.Queued) && e.SendAfter <= now
                    || e.Status == OutgoingEmailStatus.Retrying && e.NextAttemptAt <= now))
            .OrderBy(e => e.SendAfter)
            .ToListAsync(cancellationToken);
        var sent = 0;
        foreach (var email in due)
        {
            email.Close();
            if (platform.EmailPausedAt is not null)
            {
                // Held, in the order they were due, until member email resumes (L2-170 AC2).
                email.Queue();
            }
            else if (RetryBackoff.GivenUp(email.SendAfter, now))
            {
                // Too late to be worth sending: after a long pause or six hours of failures
                // (L2-170 AC3, L2-175 AC2).
                email.Drop();
            }
            else
            {
                try
                {
                    if (await SendAsync(email, ask, platform, now, cancellationToken))
                    {
                        sent++;
                    }
                }
                catch (Exception) when (!cancellationToken.IsCancellationRequested)
                {
                    // One failure stops one email; it is tried again on the backoff.
                    email.Retry(now + RetryBackoff.After(email.Attempts + 1));
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return sent;
    }

    private async Task<bool> SendAsync(
        OutgoingEmail email,
        Func<NotificationEvent, Guid, NotificationChannel, CancellationToken, Task<NotificationQuestion>> ask,
        NotificationPlatform platform,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var bundled = await db.NotificationDeliveries
            .Where(d => d.OutgoingEmailId == email.Id && (d.Status == NotificationDeliveryStatus.Bundled || d.Status == NotificationDeliveryStatus.Retrying))
            .Join(db.NotificationEvents, d => d.EventId, e => e.Id, (d, e) => new { Delivery = d, Event = e })
            .ToListAsync(cancellationToken);
        var passing = new List<(NotificationDelivery Delivery, NotificationEvent Event)>();
        TimeZoneInfo zone = TimeZoneInfo.Utc;
        foreach (var x in bundled)
        {
            var question = await ask(x.Event, email.PersonId, NotificationChannel.Email, cancellationToken);
            zone = question.Zone;
            if (question.QuietHours.Contains(LocalClock.TimeAt(now, zone)))
            {
                // A window that ends inside quiet hours waits for their end (L2-161 AC6).
                email.Defer(question.QuietHours.EndAfter(now, zone));
                email.Reopen();
                return false;
            }

            var decision = NotificationRules.Decide(question with { QuietHours = QuietHours.None });
            var rule = decision.Outcome == NotificationOutcome.Suppress ? decision.Rule : await SeenAsync(x.Event, email.PersonId, cancellationToken);
            if (rule is { } stopped)
            {
                x.Delivery.Suppress(stopped);
            }
            else
            {
                passing.Add((x.Delivery, x.Event));
            }
        }

        var model = passing.Count == 0
            ? null
            : await composer.ComposeAsync(email, passing.Select(p => p.Event).ToList(), zone, platform.BundlingMinutes, cancellationToken);
        var address = await db.People.Where(p => p.Id == email.PersonId).Select(p => p.Email).SingleOrDefaultAsync(cancellationToken);
        if (model is null || address is not { Length: > 0 })
        {
            email.Suppress(SuppressionRule.NothingNew);
            passing.ForEach(p => p.Delivery.Suppress(SuppressionRule.NothingNew));
            return false;
        }

        var rendered = await renderer.RenderAsync(model, cancellationToken);
        email.MarkSending();
        await db.SaveChangesAsync(cancellationToken);
        var result = await sender.SendAsync(
            new OutgoingEmailMessage(address, model.Shell.FromDisplayName, rendered, model.Shell.UnsubscribeUrl, links.UnsubscribePost(email.PersonId)),
            cancellationToken);
        switch (result)
        {
            case EmailSendResult.Accepted accepted:
                email.MarkSent(now, accepted.ProviderMessageId);
                passing.ForEach(p => p.Delivery.MarkSent(now));
                return true;
            case EmailSendResult.Transient:
                email.Retry(now + RetryBackoff.After(email.Attempts + 1));
                return false;
            default:
                email.Fail();
                return false;
        }
    }

    /// <summary>A chat change the person has read since is left out (L2-161 AC9).</summary>
    private async Task<SuppressionRule?> SeenAsync(NotificationEvent notification, Guid person, CancellationToken cancellationToken)
    {
        if (notification.Kind is not (NotificationKind.MentionsAndReplies or NotificationKind.DirectMessages or NotificationKind.GroupChat))
        {
            return null;
        }

        var message = await db.Messages.AsNoTracking().Where(m => m.Id == notification.SubjectId).Select(m => new { m.ThreadId, m.SentAt }).SingleOrDefaultAsync(cancellationToken);
        if (message is null)
        {
            return null;
        }

        var read = await db.ThreadReadStates
            .Where(r => r.ThreadId == message.ThreadId && db.Memberships.Any(m => m.Id == r.MembershipId && m.PersonId == person))
            .AnyAsync(r => r.LastReadSentAt >= message.SentAt, cancellationToken);
        return read ? SuppressionRule.Seen : null;
    }
}
