using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>Who posted a message: the client tells its own by `MembershipId`.</summary>
public sealed record MessageAuthorDto(Guid MembershipId, string FirstName, AvatarDto Avatar);

/// <summary>
/// A message as every member reads it. The same value travels the hub to everyone, so it says
/// nothing about who is reading, and it names its Popkin and its thread, so a client that holds
/// several knows where it belongs. `ClientMessageId` is null for a system message.
/// </summary>
public sealed record MessageDto(
    Guid Id,
    Guid PopkinId,
    Guid ThreadId,
    Guid? ClientMessageId,
    MessageKind Kind,
    MessageAuthorDto Author,
    string Text,
    DateTimeOffset SentAt)
{
    /// <summary>A message of a thread of that Popkin; the author is a member of the same Popkin.</summary>
    public static MessageDto Of(Message message, Membership author, IPhotoStore photos) =>
        new(
            message.Id,
            author.PopkinId,
            message.ThreadId,
            message.ClientMessageId,
            message.Kind,
            new MessageAuthorDto(author.Id, PersonName.FirstName(author.DisplayName), AvatarDto.Of(author, photos)),
            message.Text,
            message.SentAt);
}

/// <summary>A page of a thread, oldest first. `HasMore` says whether more lie in the direction read.</summary>
public sealed record MessagePageDto(IReadOnlyList<MessageDto> Items, bool HasMore);

public static class ChatProblems
{
    public static ProblemException ThreadNotFound() => new(404, "thread_not_found", "This conversation isn't here.");

    public static ProblemException MessageNotFound(string field) => ProblemException.Invalid("message_not_found", "That message isn't in this conversation.", field);
}

public static class ChatThreads
{
    /// <summary>
    /// The thread, when it belongs to the Popkin the caller is a member of and that membership
    /// may read it; otherwise 404 `thread_not_found`, the same for a direct message of two
    /// other members and a thread of another Popkin as for none, so a thread's existence is
    /// never disclosed (L2-023 AC2, L2-051).
    /// </summary>
    public static async Task<ChatThread> RequireAsync(IAppDbContext db, Membership membership, Guid threadId, CancellationToken cancellationToken)
    {
        var thread = await db.ChatThreads.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == threadId && t.PopkinId == membership.PopkinId, cancellationToken);
        return thread is not null && thread.CanRead(membership.Id) ? thread : throw ChatProblems.ThreadNotFound();
    }

    /// <summary>
    /// Who is told of what happens in a thread: every member of the Popkin for Everyone, and for
    /// a direct message the people of its two members who have not left, on every connection
    /// they hold, so nobody else hears of it (L2-023 AC2, L2-051).
    /// </summary>
    public static async Task<Audience> AudienceAsync(IAppDbContext db, ChatThread thread, CancellationToken cancellationToken)
    {
        if (thread.Kind == ChatThreadKind.Everyone)
        {
            return Audience.Popkin(thread.PopkinId);
        }

        var people = await db.Memberships.AsNoTracking()
            .Where(m => (m.Id == thread.MemberAId || m.Id == thread.MemberBId) && m.PopkinId == thread.PopkinId && m.LeftAt == null)
            .Select(m => m.PersonId)
            .ToListAsync(cancellationToken);
        return Audience.People(thread.PopkinId, people);
    }

    public static async Task<ChatThread> EveryoneAsync(IAppDbContext db, Guid popkinId, CancellationToken cancellationToken) =>
        await db.ChatThreads.AsNoTracking().FirstAsync(t => t.PopkinId == popkinId && t.Kind == ChatThreadKind.Everyone, cancellationToken);
}
