using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Domain;

namespace Popkin.Application.Notifications.Emails;

/// <summary>The settings every notification email needs: the footer's postal address (L2-163 AC5).</summary>
public sealed record NotificationEmailSettings(string PostalAddress);

/// <summary>
/// Builds a Popkin update from the changes its bundle holds, each read as it is now: a change that
/// no longer stands is left out, and a bundle with nothing left gives no email (L2-161 AC9). The
/// newest change leads and the next three follow, newest first (L2-164 AC6). It is the only reader
/// of members' words for this email, and logs none of them.
/// </summary>
public sealed class PopkinUpdateEmailComposer(IAppDbContext db, NotificationLinks links, NotificationEmailSettings settings)
{
    private const int AlsoNewMost = 3;

    private const int RowText = 60;

    private const int PhotosShown = 5;

    /// <summary>One change as the email shows it: leading, or as a row.</summary>
    private sealed record Change(
        NotificationKind Kind, DateTimeOffset At, string FromName, UpdateLead Lead, string Row, string Subject, string Preheader);

    private sealed record Context(PopkinSpace Popkin, Guid Recipient, TimeZoneInfo Zone);

    public async Task<PopkinUpdateEmailModel?> ComposeAsync(
        OutgoingEmail email, IReadOnlyList<NotificationEvent> events, TimeZoneInfo zone, int windowMinutes, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().SingleOrDefaultAsync(p => p.Id == email.PopkinId, cancellationToken);
        if (popkin is null)
        {
            return null;
        }

        var context = new Context(popkin, email.PersonId, zone);
        var changes = new List<Change>();
        // Photos and plan changes by one member are one change each, however many events made them.
        foreach (var group in events
            .GroupBy(e => e.Kind is NotificationKind.NewPhotos or NotificationKind.PlanChanges ? $"{e.Kind}:{e.ActorPersonId}" : e.Id.ToString())
            .OrderByDescending(g => g.Max(e => e.OccurredAt)))
        {
            if (await ReadAsync(group.OrderByDescending(e => e.OccurredAt).ToList(), context, cancellationToken) is { } change)
            {
                changes.Add(change);
            }
        }

        if (changes.Count == 0)
        {
            return null;
        }

        var lead = changes[0];
        var shell = new EmailShellModel(
            lead.Subject,
            lead.Preheader,
            lead.FromName,
            new PopkinHeader(popkin.Name, popkin.Emoji, popkin.Colour.ToString()),
            $"You’re getting this because you’re in {popkin.Name} and asked for {Lower(NotificationCatalogue.Of(lead.Kind).Name)} by email, as it happens.",
            new EmailLink($"Mute {popkin.Name}", links.MutePopkin(popkin.Id)),
            links.Settings(),
            links.Unsubscribe(email.PersonId),
            settings.PostalAddress);
        var also = changes.Skip(1).Take(AlsoNewMost).Select(c => new AlsoNewRow(c.Row, Time(c.At, zone))).ToList();
        return new PopkinUpdateEmailModel(shell, lead.Lead, also, windowMinutes);
    }

    private Task<Change?> ReadAsync(IReadOnlyList<NotificationEvent> events, Context context, CancellationToken cancellationToken) =>
        events[0].Kind switch
        {
            NotificationKind.MentionsAndReplies or NotificationKind.DirectMessages or NotificationKind.GroupChat =>
                MessageAsync(events[0], context, cancellationToken),
            NotificationKind.NewPhotos => PhotosAsync(events, context, cancellationToken),
            NotificationKind.PlanChanges => PlanAsync(events, context, cancellationToken),
            NotificationKind.PeopleJoining => JoinedAsync(events[0], context, cancellationToken),
            NotificationKind.ScheduleChanges => ScheduleAsync(events[0], context, cancellationToken),
            NotificationKind.Experiences => ExperienceAsync(events[0], context, cancellationToken),
            _ => Task.FromResult<Change?>(null),
        };

    /// <summary>A message still standing: its author, its words and, for a reply, the recipient's own message.</summary>
    private async Task<Change?> MessageAsync(NotificationEvent notification, Context context, CancellationToken cancellationToken)
    {
        var (popkin, recipient, zone) = context;
        var message = await db.Messages.AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == notification.SubjectId && m.DeletedAt == null, cancellationToken);
        if (message is null)
        {
            return null;
        }

        var author = await db.Memberships.AsNoTracking().SingleAsync(m => m.Id == message.AuthorMembershipId, cancellationToken);
        var first = EmailText.FirstName(author.DisplayName);
        var text = MessagePreview.TextOf(message);
        QuotedMessage? answers = null;
        if (notification.Kind == NotificationKind.MentionsAndReplies && message.ReplyToMessageId is { } repliedTo)
        {
            var own = await db.Messages.AsNoTracking()
                .Where(m => m.Id == repliedTo && m.DeletedAt == null)
                .Join(db.Memberships, m => m.AuthorMembershipId, a => a.Id, (m, a) => new { Message = m, a.PersonId })
                .SingleOrDefaultAsync(cancellationToken);
            if (own is not null && own.PersonId == recipient)
            {
                answers = new QuotedMessage(EmailText.Cut(MessagePreview.TextOf(own.Message), EmailText.MaxText), Time(own.Message.SentAt, zone));
            }
        }

        var (headline, subject, button) = notification.Kind switch
        {
            NotificationKind.MentionsAndReplies => (
                $"{first} replied to you", $"{first} replied to you in {popkin.Name}",
                new EmailLink("Reply in Popkin", links.Everyone(popkin.Id))),
            NotificationKind.DirectMessages => (
                $"{first} sent you a message", $"{first} sent you a message in {popkin.Name}",
                new EmailLink("Reply in Popkin", links.DirectMessage(popkin.Id, author.Id))),
            _ => (
                $"{first} in {popkin.Name}", $"{first} in {popkin.Name}",
                new EmailLink("Open the chat", links.Everyone(popkin.Id))),
        };
        var lead = new MessageLead(headline, button, author.DisplayName, EmailText.Cut(text, EmailText.MaxText), Time(message.SentAt, zone), answers);
        return new Change(
            notification.Kind, notification.OccurredAt, $"{first} via Popkin", lead, $"{first}: “{EmailText.Cut(text, RowText)}”", subject, EmailText.Preheader(text));
    }

    /// <summary>The photos one member added in the window and still in the album, newest first (L2-164 AC2).</summary>
    private async Task<Change?> PhotosAsync(IReadOnlyList<NotificationEvent> events, Context context, CancellationToken cancellationToken)
    {
        var popkin = context.Popkin;
        var ids = events.Select(e => e.SubjectId).ToList();
        var photos = await db.Photos.AsNoTracking()
            .Where(p => ids.Contains(p.Id) && p.InAlbum)
            .OrderByDescending(p => p.AddedAt)
            .ToListAsync(cancellationToken);
        if (photos.Count == 0)
        {
            return null;
        }

        var uploader = await db.Memberships.AsNoTracking().SingleAsync(m => m.Id == photos[0].UploaderMembershipId, cancellationToken);
        var first = EmailText.FirstName(uploader.DisplayName);
        var count = photos.Count == 1 ? "a photo" : $"{photos.Count} photos";
        var caption = photos.OrderBy(p => p.AddedAt).Select(p => p.Caption).FirstOrDefault(c => !string.IsNullOrWhiteSpace(c));
        var pictures = photos.Take(PhotosShown)
            .Select(p => new EmailPicture($"photo-{p.Id:N}", p.ThumbnailKey, p.Caption is { Length: > 0 } c ? EmailText.Cut(c, RowText) : $"A photo by {first}"))
            .ToList();
        var lead = new PhotosLead(
            $"{first} added {count} to the album",
            new EmailLink("See the album", links.Album(popkin.Id)),
            caption is null ? null : EmailText.Cut(caption, EmailText.MaxText),
            pictures,
            photos.Count - pictures.Count);
        return new Change(
            NotificationKind.NewPhotos, events[0].OccurredAt, $"{first} via Popkin", lead, $"{first} added {count}",
            $"{first} added {count} in {popkin.Name}", caption is null ? $"{first} added {count} to the album" : EmailText.Preheader(caption));
    }

    /// <summary>The stories one member changed in the window and still on the board (L2-164 AC3).</summary>
    private async Task<Change?> PlanAsync(IReadOnlyList<NotificationEvent> events, Context context, CancellationToken cancellationToken)
    {
        var (popkin, recipient, _) = context;
        var ids = events.Select(e => e.SubjectId).Distinct().ToList();
        var stories = await db.Stories.AsNoTracking().Where(s => ids.Contains(s.Id)).ToListAsync(cancellationToken);
        if (stories.Count == 0)
        {
            return null;
        }

        var actor = await ActorAsync(events[0], popkin.Id, cancellationToken);
        var first = actor is null ? "Someone" : EmailText.FirstName(actor.DisplayName);
        var recipientMember = await db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkin.Id && m.PersonId == recipient && m.LeftAt == null)
            .Select(m => (Guid?)m.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var lines = new List<PlanStoryLine>();
        var rows = new List<string>();
        foreach (var story in stories.OrderBy(s => ids.IndexOf(s.Id)))
        {
            var mine = events.Where(e => e.SubjectId == story.Id).ToList();
            var facts = mine.Select(e => Facts(e.Facts)).Where(f => f is not null).ToList();
            var yoursNow = recipientMember is { } me && story.OwnerMembershipId == me && mine.Any(e => e.RecipientPersonId == recipient);
            var dueFrom = facts.Select(f => DateOf(f!.Value, "dueFrom")).LastOrDefault(d => d is not null);
            var dueTo = story.DueDate;
            var dueChanged = facts.Any(f => f!.Value.TryGetProperty("dueTo", out _) || f!.Value.TryGetProperty("dueFrom", out _)) && dueFrom != dueTo;
            var columnTo = facts.Select(f => f!.Value.TryGetProperty("columnTo", out var c) ? c.GetString() : null).FirstOrDefault(c => c is not null);
            var columnFrom = facts.Select(f => f!.Value.TryGetProperty("columnFrom", out var c) ? c.GetString() : null).LastOrDefault(c => c is not null);
            var moved = columnTo is not null && columnTo != columnFrom;
            var note = yoursNow
                ? $"Given to you by {first}" + (dueTo is { } due ? $" · due {Day(due)}" : "")
                : moved ? $"Moved to {ColumnName(story.Column)}" : null;
            lines.Add(new PlanStoryLine(
                story.Title,
                yoursNow,
                note,
                dueChanged && !yoursNow && dueFrom is { } before ? $"Due {Day(before)}" : null,
                dueChanged && !yoursNow && dueTo is { } after ? $"Due {Day(after)}" : null));
            rows.Add(yoursNow ? $"{first} gave you “{EmailText.Cut(story.Title, RowText)}”"
                : moved ? $"{first} moved “{EmailText.Cut(story.Title, RowText)}” to {ColumnName(story.Column)}"
                : $"{first} changed “{EmailText.Cut(story.Title, RowText)}”");
        }

        var lead = new PlanLead($"{first} changed the plan", new EmailLink("Open the plan", links.Plan(popkin.Id)), lines);
        return new Change(
            NotificationKind.PlanChanges, events[0].OccurredAt, $"{first} via Popkin", lead,
            rows.Count == 1 ? rows[0] : $"{first} changed {rows.Count} stories", $"{first} changed the plan in {popkin.Name}", EmailText.Preheader(rows[0]));
    }

    /// <summary>Someone who joined and is still a member: whose invite, and how many that makes (L2-164 AC4).</summary>
    private async Task<Change?> JoinedAsync(NotificationEvent notification, Context context, CancellationToken cancellationToken)
    {
        var popkin = context.Popkin;
        var joined = await db.Memberships.AsNoTracking().SingleOrDefaultAsync(m => m.Id == notification.SubjectId && m.LeftAt == null, cancellationToken);
        if (joined is null)
        {
            return null;
        }

        var first = EmailText.FirstName(joined.DisplayName);
        var inviter = joined.InvitedByMembershipId is { } by
            ? await db.Memberships.AsNoTracking().Where(m => m.Id == by).Select(m => m.DisplayName).FirstOrDefaultAsync(cancellationToken)
            : null;
        var members = await db.Memberships.CountAsync(m => m.PopkinId == popkin.Id && m.LeftAt == null, cancellationToken);
        var lines = new List<string>();
        if (inviter is not null)
        {
            lines.Add($"Invited by {EmailText.FirstName(inviter)}");
        }

        lines.Add($"That makes {members} people");
        var picture = joined.PhotoKey is { } key ? new EmailPicture($"member-{joined.Id:N}", key, $"{first}’s photo") : null;
        var lead = new NoteLead($"{first} joined {popkin.Name}", new EmailLink($"Say hi to {first}", links.Everyone(popkin.Id)), lines, picture);
        return new Change(
            NotificationKind.PeopleJoining, notification.OccurredAt, "Popkin", lead, $"{first} joined the Popkin", $"{first} joined {popkin.Name}", string.Join(" · ", lines));
    }

    /// <summary>A schedule change: time off, hours or the Popkin's event.</summary>
    private async Task<Change?> ScheduleAsync(NotificationEvent notification, Context context, CancellationToken cancellationToken)
    {
        var popkin = context.Popkin;
        var actor = await ActorAsync(notification, popkin.Id, cancellationToken);
        var first = actor is null ? "Someone" : EmailText.FirstName(actor.DisplayName);
        var change = Facts(notification.Facts) is { } facts && facts.TryGetProperty("change", out var c) ? c.GetString() : null;
        var headline = change switch
        {
            "hours" => $"{first} changed their hours",
            "event" => popkin.EventLabel is { Length: > 0 } label ? $"{first} set the event: {label}" : $"{first} set the event",
            "eventRemoved" => $"{first} removed the event",
            _ => $"{first} booked time off",
        };
        var lead = new NoteLead(headline, new EmailLink("Open Schedules", links.Schedules(popkin.Id)), [], null);
        return new Change(NotificationKind.ScheduleChanges, notification.OccurredAt, $"{first} via Popkin", lead, headline, $"{headline} in {popkin.Name}", headline);
    }

    /// <summary>An experience still shared: added, rated or commented on.</summary>
    private async Task<Change?> ExperienceAsync(NotificationEvent notification, Context context, CancellationToken cancellationToken)
    {
        var popkin = context.Popkin;
        var experience = await db.Experiences.AsNoTracking().SingleOrDefaultAsync(e => e.Id == notification.SubjectId, cancellationToken);
        if (experience is null)
        {
            return null;
        }

        var actor = await ActorAsync(notification, popkin.Id, cancellationToken);
        var first = actor is null ? "Someone" : EmailText.FirstName(actor.DisplayName);
        var title = EmailText.Cut(experience.Title, RowText);
        var facts = Facts(notification.Facts);
        var change = facts is { } f && f.TryGetProperty("change", out var c) ? c.GetString() : null;
        var headline = change switch
        {
            "rated" when facts!.Value.TryGetProperty("stars", out var stars) => $"{first} rated {title} {stars.GetInt32()} {(stars.GetInt32() == 1 ? "star" : "stars")}",
            "commented" => $"{first} commented on {title}",
            _ => $"{first} added {title}",
        };
        var lead = new NoteLead(headline, new EmailLink("Open Experiences", links.Experiences(popkin.Id)), [], null);
        return new Change(NotificationKind.Experiences, notification.OccurredAt, $"{first} via Popkin", lead, headline, $"{headline} in {popkin.Name}", headline);
    }

    private Task<Membership?> ActorAsync(NotificationEvent notification, Guid popkinId, CancellationToken cancellationToken) =>
        db.Memberships.AsNoTracking()
            .Where(m => m.PopkinId == popkinId && m.PersonId == notification.ActorPersonId)
            .OrderByDescending(m => m.JoinedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private static JsonElement? Facts(string? facts) => facts is null ? null : JsonDocument.Parse(facts).RootElement;

    private static DateOnly? DateOf(JsonElement facts, string name) =>
        facts.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && DateOnly.TryParse(value.GetString(), CultureInfo.InvariantCulture, out var day)
            ? day
            : null;

    private static string ColumnName(StoryColumn column) => column switch
    {
        StoryColumn.ToDo => "To do",
        _ => column.ToString(),
    };

    private static string Day(DateOnly day) => day.ToString("ddd d MMM", CultureInfo.InvariantCulture);

    private static string Time(DateTimeOffset at, TimeZoneInfo zone) => TimeZoneInfo.ConvertTime(at, zone).ToString("H:mm", CultureInfo.InvariantCulture);

    private static string Lower(string name) => name.Length == 0 ? name : char.ToLowerInvariant(name[0]) + name[1..];
}
