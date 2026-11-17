using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Dispatch;

/// <summary>What one tick did: events fanned out and alerts sent.</summary>
public sealed record DispatchResult(int Events, int Sent);

/// <summary>One tick of the dispatcher (deliver-notifications, "Fan-out and decision").</summary>
public sealed record DispatchNotificationsCommand : IRequest<DispatchResult>;

public sealed class DispatchNotificationsCommandHandler(IAppDbContext db, TimeProvider clock, IPhoneNotificationSender phone)
    : IRequestHandler<DispatchNotificationsCommand, DispatchResult>
{
    private const int EventsPerTick = 200;

    public async Task<DispatchResult> Handle(DispatchNotificationsCommand request, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var events = await db.NotificationEvents
            .Where(e => e.DispatchedAt == null)
            .OrderBy(e => e.OccurredAt)
            .Take(EventsPerTick)
            .ToListAsync(cancellationToken);
        foreach (var notification in events)
        {
            await FanOutAsync(notification, now, cancellationToken);
            notification.MarkDispatched(now);
        }

        await db.SaveChangesAsync(cancellationToken);
        var sent = await SendPhoneAlertsAsync(now, cancellationToken);
        return new DispatchResult(events.Count, sent);
    }

    /// <summary>One delivery per person and channel, with the rules' outcome (L2-161 AC1, AC2).</summary>
    private async Task FanOutAsync(NotificationEvent notification, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var people = notification.Audience == NotificationAudience.Recipient
            ? notification.RecipientPersonId is { } recipient ? [recipient] : []
            : await db.Memberships
                .Where(m => m.PopkinId == notification.PopkinId && m.LeftAt == null && m.PersonId != notification.ActorPersonId)
                .Select(m => m.PersonId)
                .ToListAsync(cancellationToken);
        var already = await db.NotificationDeliveries
            .Where(d => d.EventId == notification.Id)
            .Select(d => new { d.PersonId, d.Channel })
            .ToListAsync(cancellationToken);
        foreach (var person in people.Distinct())
        {
            if (already.Any(d => d.PersonId == person && d.Channel == NotificationChannel.Phone))
            {
                continue;
            }

            var decision = NotificationRules.Decide(await QuestionAsync(notification, person, NotificationChannel.Phone, cancellationToken));
            db.NotificationDeliveries.Add(decision.Sends
                ? NotificationDelivery.Due(notification.Id, person, NotificationChannel.Phone, now)
                : NotificationDelivery.Suppressed(notification.Id, person, NotificationChannel.Phone, decision.Rule!.Value, now));
        }
    }

    /// <summary>Reads what the rules ask about one person, as it is now (L2-174 AC1).</summary>
    private async Task<NotificationQuestion> QuestionAsync(
        NotificationEvent notification, Guid person, NotificationChannel channel, CancellationToken cancellationToken)
    {
        var member = notification.PopkinId is not { } popkinId
            || await db.Memberships.AnyAsync(
                m => m.PopkinId == popkinId && m.PersonId == person && m.LeftAt == null
                    && db.People.Any(p => p.Id == person && p.DeletedAt == null),
                cancellationToken);
        var wrappedUp = notification.PopkinId is { } id
            && await db.Popkins.AnyAsync(p => p.Id == id && p.Status == PopkinStatus.WrappedUp, cancellationToken);
        var hasDevice = await db.PushSubscriptions.AnyAsync(s => s.PersonId == person, cancellationToken);
        var preferences = await db.NotificationPreferences.AsNoTracking().FirstOrDefaultAsync(p => p.PersonId == person, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == person).ToListAsync(cancellationToken);
        var settings = new EffectiveNotificationSettings(preferences, choices);
        return new NotificationQuestion(
            notification.Kind,
            channel,
            RecipientIsActor: person == notification.ActorPersonId,
            RecipientIsActiveMember: member,
            PopkinWrappedUp: wrappedUp,
            HasDevice: hasDevice,
            SwitchOn: settings.IsOn(notification.Kind, channel));
    }

    /// <summary>
    /// Sends each phone delivery that is due, after the rules are read again (L2-174 AC1). Each
    /// is saved on its own, so one failure stops one alert.
    /// </summary>
    private async Task<int> SendPhoneAlertsAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var due = await db.NotificationDeliveries
            .Where(d => d.Channel == NotificationChannel.Phone && d.Status == NotificationDeliveryStatus.Due && d.SendAfter <= now)
            .OrderBy(d => d.SendAfter)
            .ToListAsync(cancellationToken);
        var sent = 0;
        foreach (var delivery in due)
        {
            var notification = await db.NotificationEvents.SingleAsync(e => e.Id == delivery.EventId, cancellationToken);
            var decision = NotificationRules.Decide(await QuestionAsync(notification, delivery.PersonId, delivery.Channel, cancellationToken));
            if (!decision.Sends)
            {
                delivery.Suppress(decision.Rule!.Value);
            }
            else
            {
                await phone.SendAsync(delivery.PersonId, await AlertAsync(notification, cancellationToken), cancellationToken);
                delivery.MarkSent(now);
                sent++;
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return sent;
    }

    private async Task<PhoneAlert> AlertAsync(NotificationEvent notification, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().SingleAsync(p => p.Id == notification.PopkinId, cancellationToken);
        var actor = await db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkin.Id && m.PersonId == notification.ActorPersonId)
            .OrderByDescending(m => m.JoinedAt)
            .FirstOrDefaultAsync(cancellationToken);
        var actorName = actor is null ? "Someone" : PersonName.FirstName(actor.DisplayName);
        return PhoneAlerts.For(notification.Kind, popkin.Name, actorName, await UrlAsync(notification, popkin.Id, actor, cancellationToken));
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
