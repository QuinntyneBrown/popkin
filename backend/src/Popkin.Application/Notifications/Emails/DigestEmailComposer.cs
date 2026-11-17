using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts;
using Popkin.Application.Contacts.Reminders;
using Popkin.Application.Notifications.Digests;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Emails;

/// <summary>
/// Builds a digest from the changes it gathered, each read as it is now, one section per Popkin,
/// and the card of what needs the person in the next two days. Nothing left gives no email
/// (digest-emails, L2-165 AC5).
/// </summary>
public sealed class DigestEmailComposer(
    IAppDbContext db,
    PopkinUpdateEmailComposer updates,
    NotificationLinks links,
    NotificationEmailSettings settings,
    ContactsSwitch contacts,
    IFeatureSwitches features)
{
    public async Task<DigestEmailModel?> ComposeAsync(
        OutgoingEmail email, IReadOnlyList<NotificationEvent> events, TimeZoneInfo zone, CancellationToken cancellationToken)
    {
        var person = email.PersonId;
        var weekly = email.Kind == NotificationEmailKind.WeeklyDigest;
        var previous = await db.OutgoingEmails
            .Where(e => e.PersonId == person && e.Id != email.Id && e.OpenedAt < email.OpenedAt
                && (e.Kind == NotificationEmailKind.DailyDigest || e.Kind == NotificationEmailKind.WeeklyDigest))
            .MaxAsync(e => (DateTimeOffset?)e.OpenedAt, cancellationToken);
        var from = DigestRules.PeriodStart(previous, email.OpenedAt, weekly);

        var sections = new List<(DigestSection Section, DateTimeOffset Newest)>();
        var changeCount = 0;
        foreach (var group in events.Where(e => e.PopkinId is not null).GroupBy(e => e.PopkinId!.Value))
        {
            var popkin = await db.Popkins.AsNoTracking().SingleOrDefaultAsync(p => p.Id == group.Key, cancellationToken);
            if (popkin is null)
            {
                continue;
            }

            var changes = await updates.DigestChangesAsync(popkin, person, group.ToList(), zone, cancellationToken);
            if (changes.Count == 0)
            {
                continue;
            }

            changeCount += changes.Count;
            var lines = changes
                .OrderBy(c => DigestRules.LineRank(c.Kind, c.ForThePerson))
                .ThenByDescending(c => c.At)
                .Take(DigestRules.LinesShown)
                .ToList();
            var more = await MoreMessagesAsync(popkin.Id, person, from, email.OpenedAt, lines.Count(IsEveryoneLine), cancellationToken);
            sections.Add((new DigestSection(
                new PopkinHeader(popkin.Name, popkin.Emoji, popkin.Colour.ToString()),
                changes.Count,
                changes.SelectMany(c => c.Photos).Take(DigestRules.PhotosShown).ToList(),
                lines.Select(c => c.Row).ToList(),
                DigestRules.MoreMessages(more),
                links.Popkin(popkin.Id)), changes.Max(c => c.At)));
        }

        if (sections.Count == 0)
        {
            return null;
        }

        var ordered = DigestRules.OrderSections(sections, s => s.Section.NewCount, s => s.Newest).Select(s => s.Section).ToList();
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(email.OpenedAt, zone).DateTime);
        var needs = await NeedsYouAsync(person, today, cancellationToken);
        var name = await db.People.AsNoTracking().Where(p => p.Id == person).Select(p => p.Name).SingleAsync(cancellationToken);
        var greeting = $"Evening, {EmailText.FirstName(name)}";
        var subject = DigestRules.Subject(weekly, needs.Count, changeCount, ordered.Count);
        var preheaderLines = needs.Select(n => n.Line).Concat(ordered.SelectMany(s => s.Lines)).Take(3);
        var shell = new EmailShellModel(
            subject,
            EmailText.Preheader(string.Join(" · ", preheaderLines)),
            "Popkin",
            null,
            DigestRules.Reason(weekly),
            new EmailLink("Mute a Popkin", links.Popkins()),
            links.Settings(),
            links.Unsubscribe(person),
            settings.PostalAddress);
        return new DigestEmailModel(
            shell,
            greeting,
            DigestRules.PeriodLine(weekly),
            needs.Count == 0 ? null : DigestRules.NeedsYou(needs.Count),
            needs,
            ordered,
            new EmailLink("Open Popkin", links.MyPopkins()));
    }

    private static bool IsEveryoneLine(PopkinUpdateEmailComposer.DigestChange change) =>
        change.Kind is NotificationKind.MentionsAndReplies or NotificationKind.GroupChat;

    /// <summary>
    /// The Everyone messages members other than the person wrote in the period and the person has
    /// not read (system lines are not counted), less those a line
    /// shows; none on "Just for me" (digest-emails, "The chat count").
    /// </summary>
    private async Task<int> MoreMessagesAsync(Guid popkinId, Guid person, DateTimeOffset from, DateTimeOffset until, int shown, CancellationToken cancellationToken)
    {
        var membership = await db.Memberships.AsNoTracking().FirstOrDefaultAsync(m => m.PopkinId == popkinId && m.PersonId == person && m.LeftAt == null, cancellationToken);
        if (membership is null || membership.NotificationLevel != PopkinNotificationLevel.Everything)
        {
            return 0;
        }

        var thread = await db.ChatThreads.AsNoTracking()
            .Where(t => t.PopkinId == popkinId && t.Kind == ChatThreadKind.Everyone)
            .Select(t => (Guid?)t.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (thread is null)
        {
            return 0;
        }

        var readUntil = await db.ThreadReadStates.AsNoTracking()
            .Where(r => r.ThreadId == thread && r.MembershipId == membership.Id)
            .Select(r => (DateTimeOffset?)r.LastReadSentAt)
            .FirstOrDefaultAsync(cancellationToken);
        var after = readUntil is { } read && read > from ? read : from;
        var unread = await db.Messages.CountAsync(
            m => m.ThreadId == thread && m.Kind == MessageKind.Member && m.DeletedAt == null && m.AuthorMembershipId != membership.Id && m.SentAt > after && m.SentAt <= until,
            cancellationToken);
        return Math.Max(0, unread - shown);
    }

    /// <summary>Stories of the person's due in the next two days, then key dates, five at most (L2-165 AC2).</summary>
    private async Task<List<DigestNeed>> NeedsYouAsync(Guid person, DateOnly today, CancellationToken cancellationToken)
    {
        var last = today.AddDays(DigestRules.NeedsYouDays);
        var stories = await db.Memberships.AsNoTracking()
            .Where(m => m.PersonId == person && m.LeftAt == null)
            .Join(db.Popkins.Where(p => p.Status == PopkinStatus.Active), m => m.PopkinId, p => p.Id, (m, p) => new { Membership = m.Id, Popkin = p })
            .Join(db.Stories.Where(s => s.Column != StoryColumn.Done && s.DueDate != null && s.DueDate >= today && s.DueDate <= last),
                x => (Guid?)x.Membership, s => s.OwnerMembershipId, (x, s) => new { x.Popkin.Id, x.Popkin.Name, s.Title, s.DueDate })
            .ToListAsync(cancellationToken);
        var needs = stories
            .Where(s => features.IsOn(Feature.Plan, s.Id))
            .OrderBy(s => s.DueDate)
            .Select(s => new DigestNeed(s.Title, $"Yours in {s.Name} · due {s.DueDate!.Value.ToString("ddd d MMM", CultureInfo.InvariantCulture)}"))
            .ToList();

        var preferences = await db.NotificationPreferences.AsNoTracking().FirstOrDefaultAsync(p => p.PersonId == person, cancellationToken);
        var choices = await db.NotificationKindChoices.AsNoTracking().Where(c => c.PersonId == person).ToListAsync(cancellationToken);
        if (contacts.On && new EffectiveNotificationSettings(preferences, choices).IsOn(NotificationKind.Birthdays, NotificationChannel.Email))
        {
            var names = await db.Contacts.OwnedBy(person).Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id, c => PersonName.FirstName(c.Name), cancellationToken);
            var dates = await db.KeyDates.OwnedBy(person).Where(d => d.RemindersOn).ToListAsync(cancellationToken);
            needs.AddRange(dates
                .Where(d => names.ContainsKey(d.ContactId))
                .Select(d => (Date: d, On: d.NextOccurrence(today)))
                .Where(x => x.On is { } on && on <= last)
                .OrderBy(x => x.On)
                .Select(x => new DigestNeed(ReminderRules.DateWords(x.Date, names[x.Date.ContactId], x.On!.Value, today), "from your contacts")));
        }

        return needs.Take(DigestRules.NeedsYouShown).ToList();
    }
}
