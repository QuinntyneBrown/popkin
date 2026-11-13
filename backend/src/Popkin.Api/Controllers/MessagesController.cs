using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Chat;

namespace Popkin.Api.Controllers;

/// <summary>The messages of a thread. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/threads/{threadId:guid}/messages")]
public sealed class MessagesController(ISender sender) : ControllerBase
{
    public sealed record SendMessageRequest(Guid? ClientMessageId, string? Text);

    /// <summary>
    /// A page of the thread, oldest first, at most 50 (L2-027 AC5): the latest, the page
    /// `before` or `after` a message, or the whole window `from` one message `to` another.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<MessagePageDto>> Get(
        Guid popkinId,
        Guid threadId,
        [FromQuery] Guid? before,
        [FromQuery] Guid? after,
        [FromQuery] Guid? from,
        [FromQuery] Guid? to,
        [FromQuery] int? limit,
        CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetMessagesQuery(popkinId, threadId, before, after, from, to, limit), cancellationToken));

    /// <summary>
    /// Posts a message (L2-021): 201 when stored, 200 with the stored message when this author
    /// already sent the client message id (L2-028). At most 60 a minute per person (L2-053 AC2).
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<MessageDto>> Send(Guid popkinId, Guid threadId, SendMessageRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new SendMessageCommand(popkinId, threadId, request.ClientMessageId, request.Text), cancellationToken);
        return result.Created
            ? Created($"/api/popkins/{popkinId}/threads/{threadId}/messages/{result.Message.Id}", result.Message)
            : Ok(result.Message);
    }

    /// <summary>
    /// Deletes the caller's own message with that client message id, if the server holds one:
    /// 204 either way, so "Delete" on a message that was not sent is always safe (L2-028 AC1).
    /// </summary>
    [HttpDelete("client/{clientMessageId:guid}")]
    public async Task<IActionResult> Discard(Guid popkinId, Guid threadId, Guid clientMessageId, CancellationToken cancellationToken)
    {
        await sender.Send(new DiscardPendingMessageCommand(popkinId, threadId, clientMessageId), cancellationToken);
        return NoContent();
    }
}
