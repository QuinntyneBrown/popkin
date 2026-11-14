using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>`Created` is false when the author already sent this client message id.</summary>
public sealed record SendMessageResult(MessageDto Message, bool Created);

/// <summary>
/// Posts text, a photo or both to a thread under the name the device gave the message (L2-021,
/// L2-026, L2-028), as a reply to an earlier message of the thread when `ReplyToMessageId` names
/// one (L2-025). `PhotoId` names a photo the author uploaded for this thread and sent on no message yet.
/// </summary>
public sealed record SendMessageCommand(
    Guid PopkinId, Guid ThreadId, Guid? ClientMessageId, string? Text, Guid? ReplyToMessageId = null, Guid? PhotoId = null)
    : IRequest<SendMessageResult>;

public sealed class SendMessageCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore photos, IPopkinNotifier notifier)
    : IRequestHandler<SendMessageCommand, SendMessageResult>
{
    public async Task<SendMessageResult> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, membership, request.ThreadId, cancellationToken);

        if (request.ClientMessageId is not { } clientMessageId || clientMessageId == Guid.Empty)
        {
            throw ProblemException.Invalid("client_message_id_required", "A message needs its client message id.", "clientMessageId");
        }

        // The text is kept as typed, less the white space around it; it is never markup (L2-052 AC2).
        var text = (request.Text ?? "").Trim();
        if (text.Length == 0 && request.PhotoId is null)
        {
            throw ProblemException.Invalid("message_empty", "Write a message or choose a photo.", "text");
        }

        if (text.Length > Message.MaxTextLength)
        {
            throw ProblemException.Invalid("message_too_long", "A message is at most 2,000 characters.", "text");
        }

        // A repeat of a message this author already sent answers the stored one, whatever the
        // repeat says, so "Try again" after a lost answer adds nothing (L2-028 AC1).
        if (await StoredAsync(membership.Id, clientMessageId, cancellationToken) is { } stored)
        {
            return new SendMessageResult(await StoredDtoAsync(stored, membership, cancellationToken), Created: false);
        }

        // A reply answers a message of the same thread; a deleted one still links (L2-025 AC4).
        var replyTo = request.ReplyToMessageId is { } replyToId
            ? await db.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == replyToId && m.ThreadId == thread.Id, cancellationToken)
                ?? throw ProblemException.Invalid("reply_not_found", "That message isn't in this conversation.", "replyToMessageId")
            : null;

        // The photo is the author's own upload for this thread, and on no message yet (L2-026).
        var photo = request.PhotoId is { } photoId
            ? await db.Photos.FirstOrDefaultAsync(
                    p => p.Id == photoId && p.ThreadId == thread.Id && p.UploaderMembershipId == membership.Id && !db.Messages.Any(m => m.PhotoId == p.Id),
                    cancellationToken)
                ?? throw ProblemException.Invalid("photo_not_found", "That photo isn't one you can send here.", "photoId")
            : null;

        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw new ProblemException(409, "popkin_wrapped_up", "This Popkin has wrapped up.");
        }

        var now = clock.GetUtcNow();
        var message = Message.Send(thread.Id, membership.Id, text, clientMessageId, now, replyTo, photo);
        db.Messages.Add(message);
        // A photo sent in Everyone is also added to Photos under its sender; one sent in a
        // direct message stays the two members' own (L2-026 AC3).
        var joinsAlbum = photo is not null && thread.Kind == ChatThreadKind.Everyone;
        if (joinsAlbum)
        {
            photo!.JoinAlbum(now);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Two sends of one client message id raced and this one lost on the unique index:
            // the winner is the message.
            var winner = await StoredAsync(membership.Id, clientMessageId, cancellationToken);
            if (winner is null)
            {
                throw;
            }

            return new SendMessageResult(await StoredDtoAsync(winner, membership, cancellationToken), Created: false);
        }

        // Told after the commit, in the same request: there is no queue between store and push (L2-027 AC1).
        var sent = MessageDto.Of(
            message, membership, photos, quote: await Quotes.OfAsync(db, message, cancellationToken), photo: photo is null ? null : ChatPhotoDto.Of(photo, photos));
        await notifier.MessageAdded(await ChatThreads.AudienceAsync(db, thread, cancellationToken), sent);
        if (joinsAlbum)
        {
            await notifier.PhotosAdded(popkin.Id, [photo!.Id]);
        }

        return new SendMessageResult(sent, Created: true);
    }

    private async Task<MessageDto> StoredDtoAsync(Message stored, Membership author, CancellationToken cancellationToken) =>
        MessageDto.Of(
            stored,
            author,
            photos,
            await Reactions.OfAsync(db, stored.Id, cancellationToken),
            await Quotes.OfAsync(db, stored, cancellationToken),
            await ChatPhotos.OfAsync(db, photos, stored, cancellationToken));

    private Task<Message?> StoredAsync(Guid authorMembershipId, Guid clientMessageId, CancellationToken cancellationToken) =>
        db.Messages.AsNoTracking().FirstOrDefaultAsync(
            m => m.AuthorMembershipId == authorMembershipId && m.ClientMessageId == clientMessageId, cancellationToken);
}
