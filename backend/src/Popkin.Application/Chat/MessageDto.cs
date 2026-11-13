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
/// nothing about who is reading. `ClientMessageId` is null for a system message.
/// </summary>
public sealed record MessageDto(
    Guid Id,
    Guid ThreadId,
    Guid? ClientMessageId,
    MessageKind Kind,
    MessageAuthorDto Author,
    string Text,
    DateTimeOffset SentAt)
{
    public static MessageDto Of(Message message, Membership author, IPhotoStore photos) =>
        new(
            message.Id,
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
    /// The thread, when it belongs to the Popkin the caller is a member of; otherwise 404
    /// `thread_not_found`, the same for a thread of another Popkin as for none (L2-051).
    /// </summary>
    public static async Task<ChatThread> RequireAsync(IAppDbContext db, Guid popkinId, Guid threadId, CancellationToken cancellationToken) =>
        await db.ChatThreads.AsNoTracking().FirstOrDefaultAsync(t => t.Id == threadId && t.PopkinId == popkinId, cancellationToken)
            ?? throw ChatProblems.ThreadNotFound();

    public static async Task<ChatThread> EveryoneAsync(IAppDbContext db, Guid popkinId, CancellationToken cancellationToken) =>
        await db.ChatThreads.AsNoTracking().FirstAsync(t => t.PopkinId == popkinId && t.Kind == ChatThreadKind.Everyone, cancellationToken);
}
