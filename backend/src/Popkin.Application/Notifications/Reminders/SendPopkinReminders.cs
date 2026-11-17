using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Notifications.Dispatch;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Reminders;

/// <summary>Sent by the Worker every 5 minutes: records the Popkin reminders that are due (send-reminders).</summary>
public sealed record SendPopkinRemindersCommand : IRequest<int>;

/// <summary>
/// Records, once each, a "Stories due" event for every owned story due tomorrow where its owner
/// is, from 18:00, and a "Popkin wrapping up" event for every live Popkin in its last 24 hours
/// (L2-162, L2-167). It sends nothing itself: the dispatcher does. Answers the events recorded.
/// </summary>
public sealed class SendPopkinRemindersCommandHandler(IAppDbContext db, TimeProvider clock, IFeatureSwitches features, IPlatformSnapshot snapshot)
    : IRequestHandler<SendPopkinRemindersCommand, int>
{
    public async Task<int> Handle(SendPopkinRemindersCommand request, CancellationToken cancellationToken)
    {
        // The Worker serves no request, so the switches are refreshed here (ADR 0024).
        await snapshot.RefreshIfStaleAsync(cancellationToken);
        var now = clock.GetUtcNow();
        var live = await db.Popkins.AsNoTracking()
            .Where(p => p.Status == PopkinStatus.Active)
            .Select(p => new { p.Id, p.EndsAt, p.CreatedAt })
            .ToListAsync(cancellationToken);
        var due = new List<NotificationEvent>();

        var planOn = live.Where(p => features.IsOn(Feature.Plan, p.Id)).Select(p => p.Id).ToList();
        var stories = await db.Stories.AsNoTracking()
            .Where(s => planOn.Contains(s.PopkinId) && s.OwnerMembershipId != null && s.DueDate != null && s.Column != StoryColumn.Done)
            .Join(db.Memberships.Where(m => m.LeftAt == null), s => s.OwnerMembershipId, m => (Guid?)m.Id, (s, m) => new { Story = s, m.PersonId })
            .ToListAsync(cancellationToken);
        var people = stories.Select(s => s.PersonId).Distinct().ToList();
        var zones = await db.NotificationPreferences.AsNoTracking()
            .Where(p => people.Contains(p.PersonId))
            .ToDictionaryAsync(p => p.PersonId, p => p.TimeZone, cancellationToken);
        foreach (var x in stories)
        {
            var dueOn = x.Story.DueDate!.Value;
            var (from, until) = PopkinReminderRules.StoryDueWindow(dueOn, LocalClock.ZoneOf(zones.GetValueOrDefault(x.PersonId)));
            if (now >= from && now < until)
            {
                due.Add(NotificationEvent.Record(
                    NotificationKind.StoriesDue,
                    NotificationAudience.Recipient,
                    x.Story.PopkinId,
                    actorPersonId: null,
                    x.Story.Id,
                    x.PersonId,
                    now,
                    dedupKey: $"reminder:stories_due:{x.Story.Id}:{dueOn:yyyy-MM-dd}:{x.PersonId}",
                    facts: $$"""{"dueOn":"{{dueOn:yyyy-MM-dd}}"}"""));
            }
        }

        foreach (var popkin in live)
        {
            if (PopkinReminderRules.WrapUpWindow(popkin.EndsAt, popkin.CreatedAt) is var (from, until) && now >= from && now < until)
            {
                var endsAt = popkin.EndsAt!.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);
                due.Add(NotificationEvent.Record(
                    NotificationKind.PopkinWrappingUp,
                    NotificationAudience.Members,
                    popkin.Id,
                    actorPersonId: null,
                    popkin.Id,
                    recipientPersonId: null,
                    now,
                    dedupKey: $"reminder:wrap_up:{popkin.Id}:{endsAt}",
                    facts: $$"""{"endsAt":"{{endsAt}}"}"""));
            }
        }

        // Once only (L2-162 AC4): a key already recorded is not recorded again.
        var keys = due.Select(e => e.DedupKey).ToList();
        var recorded = (await db.NotificationEvents.Where(e => keys.Contains(e.DedupKey)).Select(e => e.DedupKey).ToListAsync(cancellationToken)).ToHashSet();
        var fresh = due.Where(e => !recorded.Contains(e.DedupKey)).ToList();
        db.NotificationEvents.AddRange(fresh);
        await db.SaveChangesAsync(cancellationToken);
        return fresh.Count;
    }
}
