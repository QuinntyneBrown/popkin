using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Popkins;
using Popkin.Application.Realtime;

namespace Popkin.Api.Controllers;

/// <summary>Popkins. Every action needs a session (the fallback policy, L2-050).</summary>
[ApiController]
[Route("api/popkins")]
public sealed class PopkinsController(ISender sender) : ControllerBase
{
    public sealed record CreatePopkinRequest(string? Name, string? Emoji, string? Colour, string? Length, DateTimeOffset? EndsAt);

    /// <summary>Starts a Popkin with its creator as Host (L2-010).</summary>
    [HttpPost]
    public async Task<ActionResult<PopkinCreatedDto>> Create(CreatePopkinRequest request, CancellationToken cancellationToken)
    {
        var created = await sender.Send(new CreatePopkinCommand(request.Name, request.Emoji, request.Colour, request.Length, request.EndsAt), cancellationToken);
        return Created($"/api/popkins/{created.Id}", created);
    }

    /// <summary>The Popkin's invite, for any member (L2-011).</summary>
    [HttpGet("{popkinId:guid}/invite")]
    public async Task<ActionResult<InviteDto>> GetInvite(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetInviteQuery(popkinId), cancellationToken));

    /// <summary>Who is here now, for any member; the recovery read of `PresenceChanged` (L2-051).</summary>
    [HttpGet("{popkinId:guid}/presence")]
    public async Task<ActionResult<PresenceDto>> GetPresence(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPresenceQuery(popkinId), cancellationToken));
}
