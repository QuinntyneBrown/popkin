using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Administration.Notifications;

namespace Popkin.Api.Controllers.Administration;

/// <summary>Notifications: member email, kinds off for everyone, holds and defaults (L2-169 to L2-173).</summary>
[Route("api/admin/notifications")]
public sealed class AdminNotificationsController(ISender sender) : AdminControllerBase
{
    public sealed record ReasonRequest(string? Reason);

    [HttpGet]
    public async Task<ActionResult<AdminNotificationsDto>> GetNotifications(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetAdminNotificationsQuery(), cancellationToken));

    [HttpPost("pause")]
    public async Task<ActionResult<AdminSendStatusDto>> Pause(ReasonRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new PauseMemberEmailCommand(request.Reason), cancellationToken));

    [HttpPost("resume")]
    public async Task<ActionResult<AdminSendStatusDto>> Resume(ReasonRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new ResumeMemberEmailCommand(request.Reason), cancellationToken));

    public sealed record SwitchKindRequest(bool On, string? Reason);

    [HttpPut("kinds/{kind}")]
    public async Task<ActionResult<AdminNotificationKindDto>> SwitchKind(string kind, SwitchKindRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SwitchNotificationKindCommand(kind, request.On, request.Reason), cancellationToken));

    [HttpGet("defaults")]
    public async Task<ActionResult<AdminNotificationDefaultsDto>> GetDefaults(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetNotificationDefaultsQuery(), cancellationToken));

    public sealed record DefaultsRequest(
        string? ActivityEmail, int BundleMinutes, int MostEmailsPerDay, string? QuietFrom, string? QuietTo, string? BirthdayLead, string? Reason);

    [HttpPut("defaults")]
    public async Task<ActionResult<AdminNotificationDefaultsDto>> ChangeDefaults(DefaultsRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(
            new ChangeNotificationDefaultsCommand(
                request.ActivityEmail, request.BundleMinutes, request.MostEmailsPerDay, request.QuietFrom, request.QuietTo, request.BirthdayLead, request.Reason),
            cancellationToken));

    [HttpGet("holds")]
    public async Task<ActionResult<AdminNotificationHoldsDto>> GetHolds(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetNotificationHoldsQuery(), cancellationToken));

    [HttpGet("holds/popkin-search")]
    public async Task<ActionResult<IReadOnlyList<HoldPopkinMatchDto>>> SearchPopkins([FromQuery] string? q, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SearchHoldPopkinsQuery(q), cancellationToken));

    public sealed record HoldRequest(Guid PopkinId, string? Reason);

    [HttpPost("holds")]
    public async Task<ActionResult<AdminNotificationHoldDto>> Hold(HoldRequest request, CancellationToken cancellationToken) =>
        StatusCode(StatusCodes.Status201Created, await sender.Send(new HoldPopkinNotificationsCommand(request.PopkinId, request.Reason), cancellationToken));

    [HttpPost("holds/{holdId:guid}/release")]
    public async Task<IActionResult> Release(Guid holdId, ReasonRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new ReleaseNotificationHoldCommand(holdId, request.Reason), cancellationToken);
        return Ok();
    }
}
