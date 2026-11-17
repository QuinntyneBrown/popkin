using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Chat;
using Popkin.Application.Notifications.Dispatch;
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

    /// <summary>One change as the email shows it: leading, or as a row.</summary>
    private sealed record Change(NotificationKind Kind, DateTimeOffset At, string ActorFirstName, UpdateLead Lead, string Row, string Subject, string Preheader);

    public async Task<PopkinUpdateEmailModel?> ComposeAsync(
        OutgoingEmail email, IReadOnlyList<NotificationEvent> events, TimeZoneInfo zone, int windowMinutes, CancellationToken cancellationToken)
    {
        var popkin = await db.Popkins.AsNoTracking().SingleOrDefaultAsync(p => p.Id == email.PopkinId, cancellationToken);
        if (popkin is null)
        {
            return null;
        }

        var changes = new List<Change>();
        foreach (var notification in events.OrderByDescending(e => e.OccurredAt))
        {
            if (await ReadAsync(notification, popkin, email.PersonId, zone, cancellationToken) is { } change)
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
            $"{lead.ActorFirstName} via Popkin",
            new PopkinHeader(popkin.Name, popkin.Emoji, popkin.Colour.ToString()),
            $"You’re getting this because you’re in {popkin.Name} and asked for {Lower(NotificationCatalogue.Of(lead.Kind).Name)} by email, as it happens.",
            new EmailLink($"Mute {popkin.Name}", links.MutePopkin(popkin.Id)),
            links.Settings(),
            links.Unsubscribe(email.PersonId),
            settings.PostalAddress);
        var also = changes.Skip(1).Take(AlsoNewMost).Select(c => new AlsoNewRow(c.Row, Time(c.At, zone))).ToList();
        return new PopkinUpdateEmailModel(shell, lead.Lead, also, windowMinutes);
    }

    private Task<Change?> ReadAsync(NotificationEvent notification, PopkinSpace popkin, Guid recipient, TimeZoneInfo zone, CancellationToken cancellationToken) =>
        notification.Kind switch
        {
            NotificationKind.MentionsAndReplies or NotificationKind.DirectMessages or NotificationKind.GroupChat =>
                MessageAsync(notification, popkin, recipient, zone, cancellationToken),
            _ => Task.FromResult<Change?>(null),
        };

    /// <summary>A message still standing: its author, its words and, for a reply, the recipient's own message.</summary>
    private async Task<Change?> MessageAsync(
        NotificationEvent notification, PopkinSpace popkin, Guid recipient, TimeZoneInfo zone, CancellationToken cancellationToken)
    {
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
            notification.Kind, notification.OccurredAt, first, lead, $"{first}: “{EmailText.Cut(text, RowText)}”", subject, EmailText.Preheader(text));
    }

    private static string Time(DateTimeOffset at, TimeZoneInfo zone) => TimeZoneInfo.ConvertTime(at, zone).ToString("H:mm", System.Globalization.CultureInfo.InvariantCulture);

    private static string Lower(string name) => name.Length == 0 ? name : char.ToLowerInvariant(name[0]) + name[1..];
}
