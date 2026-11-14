using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// The quote a reply carries of the message it answers (L2-025 AC2): the author's first name
/// and one line of the text. When that message was deleted, `Deleted` is true and the name and
/// snippet are null (AC4).
/// </summary>
public sealed record QuoteDto(Guid MessageId, string? AuthorFirstName, string? Snippet, bool Deleted)
{
    /// <summary>A snippet is at most 120 characters.</summary>
    public const int MaxSnippetLength = 120;

    public static QuoteDto Of(Message quoted, Membership author) =>
        quoted.DeletedAt is null
            ? new QuoteDto(quoted.Id, PersonName.FirstName(author.DisplayName), SnippetOf(quoted.Text), Deleted: false)
            : new QuoteDto(quoted.Id, null, null, Deleted: true);

    /// <summary>The first line of the text, cut to at most 120 characters between two grapheme clusters, so no emoji is cut in two.</summary>
    public static string SnippetOf(string text)
    {
        var end = text.IndexOfAny(['\r', '\n']);
        var line = end < 0 ? text : text[..end];
        if (line.Length <= MaxSnippetLength)
        {
            return line;
        }

        var length = 0;
        var elements = StringInfo.GetTextElementEnumerator(line);
        while (elements.MoveNext() && length + elements.GetTextElement().Length <= MaxSnippetLength)
        {
            length += elements.GetTextElement().Length;
        }

        return line[..length];
    }
}

public static class Quotes
{
    /// <summary>The quote of each message given that is a reply, by the reply's id; a message that replies to nothing is absent.</summary>
    public static async Task<Dictionary<Guid, QuoteDto>> OfAsync(IAppDbContext db, IReadOnlyCollection<Message> messages, CancellationToken cancellationToken)
    {
        var quotedIds = messages.Where(m => m.ReplyToMessageId is not null).Select(m => m.ReplyToMessageId!.Value).Distinct().ToList();
        if (quotedIds.Count == 0)
        {
            return [];
        }

        var quoted = await db.Messages.AsNoTracking().Where(m => quotedIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        var authorIds = quoted.Values.Select(m => m.AuthorMembershipId).Distinct().ToList();
        var authors = await db.Memberships.AsNoTracking().Where(m => authorIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id, cancellationToken);
        return messages
            .Where(m => m.ReplyToMessageId is { } id && quoted.ContainsKey(id))
            .ToDictionary(m => m.Id, m =>
            {
                var target = quoted[m.ReplyToMessageId!.Value];
                return QuoteDto.Of(target, authors[target.AuthorMembershipId]);
            });
    }

    /// <summary>The quote of one message: null when it replies to nothing.</summary>
    public static async Task<QuoteDto?> OfAsync(IAppDbContext db, Message message, CancellationToken cancellationToken) =>
        (await OfAsync(db, [message], cancellationToken)).GetValueOrDefault(message.Id);
}
