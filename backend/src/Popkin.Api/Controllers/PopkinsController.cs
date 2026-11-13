using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Popkins;
using Popkin.Application.Realtime;
using Popkin.Application.WrapUp;

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

    /// <summary>My Popkins: the caller's own, active and wrapped up (L2-017, L2-018, L2-051 AC3).</summary>
    [HttpGet]
    public async Task<ActionResult<MyPopkinsDto>> List(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetMyPopkinsQuery(), cancellationToken));

    /// <summary>The header of the Popkin home, for any member (L2-019, L2-051).</summary>
    [HttpGet("{popkinId:guid}")]
    public async Task<ActionResult<PopkinHomeDto>> GetHome(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPopkinHomeQuery(popkinId), cancellationToken));

    /// <summary>What the wrap-up screen tells the Host the recap will count (L2-043 AC1).</summary>
    [HttpGet("{popkinId:guid}/wrap-up")]
    public async Task<ActionResult<WrapUpPreviewDto>> GetWrapUpPreview(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetWrapUpPreviewQuery(popkinId), cancellationToken));

    public sealed record WrapUpPopkinRequest(bool? KeepPhotos);

    /// <summary>The Host wraps the Popkin up, keeping its photo album or not (L2-043).</summary>
    [HttpPost("{popkinId:guid}/wrap-up")]
    public async Task<ActionResult<WrapUpResultDto>> WrapUp(Guid popkinId, WrapUpPopkinRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new WrapUpPopkinCommand(popkinId, request.KeepPhotos), cancellationToken));

    public sealed record InviteCrewRequest(Guid? FromPopkinId);

    /// <summary>
    /// "Pop up another with this crew" (L2-046 AC5): sends this Popkin's invite to every member
    /// of the wrapped-up Popkin named, for the Host of both.
    /// </summary>
    [HttpPost("{popkinId:guid}/crew-invites")]
    public async Task<IActionResult> InviteCrew(Guid popkinId, InviteCrewRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new InviteCrewCommand(popkinId, request.FromPopkinId), cancellationToken);
        return Accepted();
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
