using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>`Created` is false when the author already sent this client message id.</summary>
public sealed record SendMessageResult(MessageDto Message, bool Created);

/// <summary>Posts text to a thread under the name the device gave the message (L2-021, L2-028).</summary>
public sealed record SendMessageCommand(Guid PopkinId, Guid ThreadId, Guid? ClientMessageId, string? Text) : IRequest<SendMessageResult>;

public sealed class SendMessageCommandHandler(
    IAppDbContext db, IMembershipGuard guard, TimeProvider clock, IPhotoStore photos)
    : IRequestHandler<SendMessageCommand, SendMessageResult>
{
    public async Task<SendMessageResult> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var (popkin, membership) = await guard.RequireMemberAsync(request.PopkinId, cancellationToken);
        var thread = await ChatThreads.RequireAsync(db, popkin.Id, request.ThreadId, cancellationToken);

        if (request.ClientMessageId is not { } clientMessageId || clientMessageId == Guid.Empty)
        {
            throw ProblemException.Invalid("client_message_id_required", "A message needs its client message id.", "clientMessageId");
        }

        // The text is kept as typed, less the white space around it; it is never markup (L2-052 AC2).
        var text = (request.Text ?? "").Trim();
        if (text.Length == 0)
        {
            throw ProblemException.Invalid("message_empty", "Write a message first.", "text");
        }

        if (text.Length > Message.MaxTextLength)
        {
            throw ProblemException.Invalid("message_too_long", "A message is at most 2,000 characters.", "text");
        }

        if (popkin.Status == PopkinStatus.WrappedUp)
        {
            throw new ProblemException(409, "popkin_wrapped_up", "This Popkin has wrapped up.");
        }

        var message = Message.Send(thread.Id, membership.Id, text, clientMessageId, clock.GetUtcNow());
        db.Messages.Add(message);
        await db.SaveChangesAsync(cancellationToken);
        return new SendMessageResult(MessageDto.Of(message, membership, photos), Created: true);
    }
}
