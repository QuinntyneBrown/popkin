using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Telemetry;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>What one tick did: events fanned out and alerts sent.</summary>
public sealed record DispatchResult(int Events, int Sent);

/// <summary>One tick of the dispatcher (deliver-notifications, "Fan-out and decision").</summary>
public sealed record DispatchNotificationsCommand : IRequest<DispatchResult>;

public sealed class DispatchNotificationsCommandHandler(
    IAppDbContext db, TimeProvider clock, IPhoneNotificationSender phone, IFeatureSwitches features, IPlatformSnapshot snapshot, UpdateEmails emails, PopkinMetrics metrics)
    : IRequestHandler<DispatchNotificationsCommand, DispatchResult>
{
    private const int EventsPerTick = 200;

    public async Task<DispatchResult> Handle(DispatchNotificationsCommand request, CancellationToken cancellationToken)
    {
        // The Worker serves no request, so the switches are refreshed here (ADR 0024).
        await snapshot.RefreshIfStaleAsync(cancellationToken);
        var now = clock.GetUtcNow();
        var platform = await db.NotificationPlatforms.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
            ?? NotificationPlatform.Defaults();
        var events = await db.NotificationEvents
            .Where(e => e.DispatchedAt == null)
            .OrderBy(e => e.OccurredAt)
            .Take(EventsPerTick)
            .ToListAsync(cancellationToken);
        foreach (var notification in events)
        {
            await FanOutAsync(notification, platform, now, cancellationToken);
            notification.MarkDispatched(now);
            metrics.NotificationEvent(notification.Kind.ToString());
        }

        await db.SaveChangesAsync(cancellationToken);
        var sent = await SendPhoneAlertsAsync(platform, now, cancellationToken);
        sent += await emails.SendDueAsync(
            (notification, person, channel, ct) => QuestionAsync(notification, person, channel, platform, now, ct), platform, now, cancellationToken);
        return new DispatchResult(events.Count, sent);
    }

    /// <summary>One delivery per person and channel, with the rules' outcome (L2-161 AC1, AC2).</summary>
    private async Task FanOutAsync(NotificationEvent notification, NotificationPlatform platform, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var people = notification.Audience == NotificationAudience.Recipient
            ? notification.RecipientPersonId is { } recipient ? [recipient] : []
            : await db.Memberships
                // Only those who were members when it happened: one who joined since hears nothing of it.
                .Where(m => m.PopkinId == notification.PopkinId && m.LeftAt == null && m.JoinedAt <= notification.OccurredAt
                    && m.PersonId != notification.ActorPersonId)
                .Select(m => m.PersonId)
                .ToListAsync(cancellationToken);
        // A reply's author hears of the reply, not of the same message in Everyone too, so one
        // message never reaches one person twice (deliver-notifications).
        if (notification.Kind == NotificationKind.GroupChat)
        {
            var told = await db.NotificationEvents
                .Where(e => e.SubjectId == notification.SubjectId && e.Kind == NotificationKind.MentionsAndReplies && e.RecipientPersonId != null)
                .Select(e => e.RecipientPersonId!.Value)
                .ToListAsync(cancellationToken);
            people = people.Except(told).ToList();
        }

        var already = await db.NotificationDeliveries
            .Where(d => d.EventId == notification.Id)
            .Select(d => new { d.PersonId, d.Channel })
            .ToListAsync(cancellationToken);
        foreach (var person in people.Distinct())
        {
            foreach (var channel in ReminderEvents.ChannelsOf(notification))
            {
                if (already.Any(d => d.PersonId == person && d.Channel == channel))
                {
                    continue;
                }

                var question = await QuestionAsync(notification, person, channel, platform, now, cancellationToken);
                var decision = NotificationRules.Decide(question);
                if (decision.Rule is { } rule)
                {
                    metrics.Suppressed(notification.Kind, channel, rule);
                }

                db.NotificationDeliveries.Add(
                    decision.Outcome == NotificationOutcome.Suppress
                        ? NotificationDelivery.Suppressed(notification.Id, person, channel, decision.Rule!.Value, now)
                    : channel == NotificationChannel.Phone
                        ? NotificationDelivery.Due(notification.Id, person, channel, decision.At)
                    : await emails.PlaceAsync(notification, person, decision, question, question.Frequency, platform, now, cancellationToken));
            }
        }
    }

    /// <summary>Reads what the rules ask about one person, as it is now (L2-174 AC1).</summary>
    private async Task<NotificationQuestion> QuestionAsync(
        NotificationEvent notification,
        Guid person,
        NotificationChannel channel,
        NotificationPlatform platform,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var account = await db.People.AsNoTracking()
            .Where(p => p.Id == person)
            .Select(p => new { p.Email, p.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);
        var membership = notification.PopkinId is { } popkinId
            ? await db.Memberships.AsNoTracking().FirstOrDefaultAsync(m => m.PopkinId == popkinId && m.PersonId == person && m.LeftAt == null, cancellationToken)
            : null;
        var member = account is { DeletedAt: null } && (notification.PopkinId is null || membership is not null);
        var wrappedUp = notification.PopkinId is { } id
            && await db.Popkins.AnyAsync(p => p.Id == id && p.Status == PopkinStatus.WrappedUp, cancellationToken);
        var feature = NotificationCatalogue.Of(notification.Kind).Feature;
        var featureOff = feature is { } f && notification.PopkinId is { } popkin && !features.IsOn(f, popkin);
        var hasDevice = channel == NotificationChannel.Phone
            && await db.PushSubscriptions.AnyAsync(s => s.PersonId == person, cancellationToken);
        var preferences = await db.NotificationPreferences.AsNoTracking().FirstOrDefaultAsync(p => p.PersonId == person, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == person).ToListAsync(cancellationToken);
        var settings = new EffectiveNotificationSettings(preferences, choices);
        return new NotificationQuestion(notification.Kind, channel, now, LocalClock.ZoneOf(preferences?.TimeZone))
        {
            RecipientIsActor = person == notification.ActorPersonId,
            RecipientIsActiveMember = member,
            PopkinWrappedUp = wrappedUp,
            FeatureOff = featureOff,
            HasAddress = account?.Email is { Length: > 0 },
            HasDevice = hasDevice,
            EmailPaused = platform.EmailPausedAt is not null,
            EmailOn = settings.EmailOn,
            Frequency = settings.Frequency,
            RecipientIsNamed = person == notification.RecipientPersonId,
            Level = membership?.NotificationLevel ?? PopkinNotificationLevel.Everything,
            ActorMuted = NotificationRules.ActorMuted(
                await db.PersonMutes.Where(m => m.PersonId == person).Select(m => m.MutedPersonId).ToListAsync(cancellationToken),
                notification.ActorPersonId),
            SwitchOn = settings.IsOn(notification.Kind, channel),
            QuietHours = new QuietHours(platform.QuietFrom, platform.QuietUntil),
        };
    }

    /// <summary>
    /// Sends each phone delivery that is due, after the rules are read again (L2-174 AC1). The
    /// alerts quiet hours held back for one person and one Popkin go as one. Each is saved on its
    /// own, so one failure stops one alert.
    /// </summary>
    private async Task<int> SendPhoneAlertsAsync(NotificationPlatform platform, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var due = await db.NotificationDeliveries
            .Where(d => d.Channel == NotificationChannel.Phone
                && (d.Status == NotificationDeliveryStatus.Due && d.SendAfter <= now
                    || d.Status == NotificationDeliveryStatus.Retrying && d.NextAttemptAt <= now))
            .Join(db.NotificationEvents, d => d.EventId, e => e.Id, (d, e) => new { Delivery = d, Event = e })
            .OrderBy(x => x.Event.OccurredAt)
            .ToListAsync(cancellationToken);
        var sent = 0;
        foreach (var group in due.GroupBy(x => (x.Delivery.PersonId, x.Event.PopkinId)))
        {
            var passing = new List<(NotificationDelivery Delivery, NotificationEvent Event)>();
            var zones = new Dictionary<Guid, TimeZoneInfo>();
            foreach (var (delivery, notification) in group.Select(x => (x.Delivery, x.Event)))
            {
                // A delivery held for the end of quiet hours is not held again by them now.
                var question = await QuestionAsync(notification, delivery.PersonId, delivery.Channel, platform, now, cancellationToken);
                var decision = NotificationRules.Decide(question with { QuietHours = QuietHours.None });
                if (decision.Sends)
                {
                    passing.Add((delivery, notification));
                    zones[delivery.Id] = question.Zone;
                }
                else
                {
                    delivery.Suppress(decision.Rule!.Value);
                    metrics.Suppressed(notification.Kind, delivery.Channel, decision.Rule!.Value);
                }
            }

            if (passing.Count > 0)
            {
                var heldBack = group.Key.PopkinId is not null && passing.Count > 1
                    && passing.All(p => !ReminderEvents.IsReminder(p.Event.Kind) && p.Delivery.SendAfter > p.Event.OccurredAt.AddMinutes(1));
                var alerts = new List<PhoneAlert>();
                if (heldBack)
                {
                    alerts.Add(await HeldBackAlertAsync(passing[0].Event, passing.Count, cancellationToken));
                }
                else
                {
                    foreach (var (delivery, notification) in passing.ToList())
                    {
                        if (await AlertAsync(notification, delivery.PersonId, zones[delivery.Id], cancellationToken) is { } alert)
                        {
                            alerts.Add(alert);
                        }
                        else
                        {
                            // A reminder whose story or end no longer stands (L2-162 AC2, L2-174 AC1).
                            delivery.Suppress(SuppressionRule.NothingNew);
                            metrics.Suppressed(notification.Kind, delivery.Channel, SuppressionRule.NothingNew);
                            passing.Remove((delivery, notification));
                        }
                    }
                }

                try
                {
                    foreach (var alert in alerts)
                    {
                        await phone.SendAsync(group.Key.PersonId, alert, cancellationToken);
                        sent++;
                    }

                    foreach (var (delivery, notification) in passing)
                    {
                        delivery.MarkSent(now);
                        metrics.NotificationDelivered(notification.Kind.ToString(), "phone", "sent");
                        metrics.PhoneAccepted(now - notification.OccurredAt);
                    }
                }
                catch (Exception) when (!cancellationToken.IsCancellationRequested)
                {
                    // No device took it: tried again on the backoff, and given up at six hours.
                    foreach (var (delivery, notification) in passing)
                    {
                        if (RetryBackoff.GivenUp(delivery.SendAfter, now))
                        {
                            delivery.Drop();
                            metrics.NotificationDelivered(notification.Kind.ToString(), "phone", "dropped");
                        }
                        else
                        {
                            delivery.Retry(now + RetryBackoff.After(delivery.Attempts + 1));
                        }
                    }
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return sent;
    }

    /// <summary>The one alert for what quiet hours held back in one Popkin.</summary>
    private async Task<PhoneAlert> HeldBackAlertAsync(NotificationEvent first, int count, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().SingleAsync(p => p.Id == first.PopkinId, cancellationToken);
        return new PhoneAlert(popkin.Name, PhoneAlerts.HeldBack(count), $"/p/{popkin.Id}");
    }

    private async Task<PhoneAlert?> AlertAsync(NotificationEvent notification, Guid person, TimeZoneInfo zone, CancellationToken cancellationToken)
    {
        switch (notification.Kind)
        {
            case NotificationKind.Birthdays:
                return await ContactReminderAlertAsync(notification, cancellationToken);
            case NotificationKind.StoriesDue:
                return await Emails.StoryDueEmailComposer.StandingAsync(db, notification, person, cancellationToken) is var (story, popkinOf, _)
                    ? new PhoneAlert($"Due tomorrow: {story.Title}", "", $"/p/{popkinOf.Id}/plan")
                    : null;
            case NotificationKind.PopkinWrappingUp:
                return await Emails.WrapUpEmailComposer.StandingAsync(db, notification, cancellationToken) is { } ending
                    ? new PhoneAlert($"{ending.Name} wraps up tomorrow at {Emails.WrapUpEmailComposer.Time(ending.EndsAt!.Value, zone)}", "", $"/p/{ending.Id}/photos")
                    : null;
        }

        var popkin = await db.Popkins.AsNoTracking().SingleAsync(p => p.Id == notification.PopkinId, cancellationToken);
        var actor = await db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkin.Id && m.PersonId == notification.ActorPersonId)
            .OrderByDescending(m => m.JoinedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var actorName = actor is null ? "Someone" : PersonName.FirstName(actor.DisplayName);
        return PhoneAlerts.For(notification.Kind, popkin.Name, actorName, await UrlAsync(notification, popkin.Id, actor, cancellationToken));
    }

    /// <summary>
    /// A contact's reminder in its own words: a key date or a habit opens the contact's profile,
    /// a follow-up opens Follow-ups (send-reminders, "Phone alerts").
    /// </summary>
    private async Task<PhoneAlert> ContactReminderAlertAsync(NotificationEvent notification, CancellationToken cancellationToken)
    {
        var reminder = await db.ContactReminders.AsNoTracking().SingleAsync(r => r.Id == notification.SubjectId, cancellationToken);
        var url = reminder.Kind == ReminderKind.FollowUp ? "/contacts/follow-ups"
            : reminder.ContactId is { } contact ? $"/contacts/people/{contact}"
            : "/contacts";
        return new PhoneAlert(reminder.Words, "", url);
    }

    /// <summary>The app path the alert opens: the conversation for a message, the Popkin otherwise.</summary>
    private async Task<string> UrlAsync(NotificationEvent notification, Guid popkinId, Membership? actor, CancellationToken cancellationToken)
    {
        if (notification.Kind is NotificationKind.MentionsAndReplies or NotificationKind.DirectMessages or NotificationKind.GroupChat)
        {
            var thread = await db.Messages.AsNoTracking()
                .Where(m => m.Id == notification.SubjectId)
                .Join(db.ChatThreads, m => m.ThreadId, t => t.Id, (m, t) => t)
                .FirstOrDefaultAsync(cancellationToken);
            return thread?.Kind == ChatThreadKind.Direct && actor is not null
                ? $"/p/{popkinId}/chat/{actor.Id}"
                : $"/p/{popkinId}/chat/everyone";
        }

        return $"/p/{popkinId}";
    }
}
