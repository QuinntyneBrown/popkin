using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>
/// One emoji of a message's summary and the members who chose it, in the order they chose it.
/// Members of a Popkin may see who reacted; the client counts them and finds its own (L2-024).
/// </summary>
public sealed record ReactionDto(string Emoji, IReadOnlyList<Guid> MembershipIds);

/// <summary>The summaries of reactions, as every read of messages and every reaction answers them.</summary>
public static class Reactions
{
    /// <summary>The summary of each message given that has a reaction; one without is absent.</summary>
    public static async Task<Dictionary<Guid, IReadOnlyList<ReactionDto>>> OfAsync(
        IAppDbContext db, IReadOnlyCollection<Guid> messageIds, CancellationToken cancellationToken)
    {
        var rows = await db.MessageReactions.AsNoTracking().Where(r => messageIds.Contains(r.MessageId)).ToListAsync(cancellationToken);
        return rows.GroupBy(r => r.MessageId).ToDictionary(g => g.Key, g => Summary(g));
    }

    /// <summary>The summary of one message: empty when it has no reaction.</summary>
    public static async Task<IReadOnlyList<ReactionDto>> OfAsync(IAppDbContext db, Guid messageId, CancellationToken cancellationToken) =>
        (await OfAsync(db, [messageId], cancellationToken)).GetValueOrDefault(messageId) ?? [];

    /// <summary>
    /// Grouped by emoji in order of first use, and each emoji's members in the order they chose
    /// it; ties fall to the ordinal order of the emoji and of the membership id, so every read
    /// gives the same summary.
    /// </summary>
    private static IReadOnlyList<ReactionDto> Summary(IEnumerable<MessageReaction> reactions) =>
        reactions
            .GroupBy(r => r.Emoji, StringComparer.Ordinal)
            .OrderBy(g => g.Min(r => r.ReactedAt))
            .ThenBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => new ReactionDto(g.Key, g.OrderBy(r => r.ReactedAt).ThenBy(r => r.MembershipId).Select(r => r.MembershipId).ToList()))
            .ToList();
}
