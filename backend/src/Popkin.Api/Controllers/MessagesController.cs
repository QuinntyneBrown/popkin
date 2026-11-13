using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Chat;

namespace Popkin.Api.Controllers;

/// <summary>The messages of a thread. Every action needs a session and a membership (L2-050, L2-051).</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/threads/{threadId:guid}/messages")]
public sealed class MessagesController(ISender sender) : ControllerBase
{
    public sealed record SendMessageRequest(Guid? ClientMessageId, string? Text);

    /// <summary>A page of the thread, oldest first (L2-027 AC5).</summary>
    [HttpGet]
    public async Task<ActionResult<MessagePageDto>> Get(Guid popkinId, Guid threadId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetMessagesQuery(popkinId, threadId), cancellationToken));

    /// <summary>Posts a message (L2-021).</summary>
    [HttpPost]
    public async Task<ActionResult<MessageDto>> Send(Guid popkinId, Guid threadId, SendMessageRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new SendMessageCommand(popkinId, threadId, request.ClientMessageId, request.Text), cancellationToken);
        return result.Created
            ? Created($"/api/popkins/{popkinId}/threads/{threadId}/messages/{result.Message.Id}", result.Message)
            : Ok(result.Message);
    }
}
