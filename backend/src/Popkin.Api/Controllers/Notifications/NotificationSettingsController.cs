using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Notifications.Mutes;
using Popkin.Application.Notifications.Settings;

namespace Popkin.Api.Controllers.Notifications;

/// <summary>
/// The signed-in person's own notification settings (L2-155), authenticated by the fallback policy.
/// No route names another person, so nobody reads or changes anyone else's (L2-174 AC4).
/// </summary>
[ApiController]
[Route("api/me/notifications")]
public sealed class NotificationSettingsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<NotificationSettingsDto>> Get(CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetNotificationSettingsQuery(), cancellationToken));

    public sealed record KindRequest(bool? Email, bool? Phone);

    /// <summary>One kind by email, by phone or both (L2-157 AC3): 400 `invalid_kind`, `notification_required` or `nothing_to_change`.</summary>
    [HttpPut("kinds/{kind}")]
    public async Task<IActionResult> SetKind(string kind, KindRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetNotificationKindCommand(kind, request.Email, request.Phone), cancellationToken);
        return NoContent();
    }

    public sealed record EmailRequest(bool? On);

    /// <summary>Activity email on or off (L2-156 AC3, AC4): 409 `no_email_address` to turn it on without one (AC5).</summary>
    [HttpPut("email")]
    public async Task<IActionResult> SetEmail(EmailRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetActivityEmailCommand(request.On), cancellationToken);
        return NoContent();
    }

    public sealed record FrequencyRequest(string? Frequency);

    /// <summary>How often activity email comes (L2-156 AC1): 400 `invalid_frequency`.</summary>
    [HttpPut("frequency")]
    public async Task<IActionResult> SetFrequency(FrequencyRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetActivityFrequencyCommand(request.Frequency), cancellationToken);
        return NoContent();
    }

    public sealed record LevelRequest(string? Level);

    /// <summary>One Popkin's level (L2-158): 400 `invalid_level`, 404 `popkin_not_found`, 409 `popkin_wrapped_up`.</summary>
    [HttpPut("popkins/{popkinId:guid}")]
    public async Task<IActionResult> SetLevel(Guid popkinId, LevelRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new SetPopkinNotificationLevelCommand(popkinId, request.Level), cancellationToken);
        return NoContent();
    }

    /// <summary>Up to five people the caller shares an active Popkin with (L2-160 AC2): 400 `invalid_query`.</summary>
    [HttpGet("mute-candidates")]
    public async Task<ActionResult<IReadOnlyList<MuteCandidateDto>>> MuteCandidates(string? q, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new SearchMuteCandidatesQuery(q), cancellationToken));

    public sealed record MuteRequest(Guid MembershipId);

    /// <summary>Mutes a person (L2-160 AC1): the existing row when muted already; 404 `person_not_found` (AC7).</summary>
    [HttpPost("mutes")]
    public async Task<ActionResult<MutedPersonDto>> Mute(MuteRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new MutePersonCommand(request.MembershipId), cancellationToken));

    /// <summary>Unmutes (L2-160 AC5): 404 `mute_not_found` for a row that is not the caller's.</summary>
    [HttpDelete("mutes/{muteId:guid}")]
    public async Task<IActionResult> Unmute(Guid muteId, CancellationToken cancellationToken)
    {
        await sender.Send(new UnmutePersonCommand(muteId), cancellationToken);
        return NoContent();
    }
}
