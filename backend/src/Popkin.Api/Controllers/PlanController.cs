using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Popkin.Api.RateLimiting;
using Popkin.Application.Plan;

namespace Popkin.Api.Controllers;

/// <summary>The Plan tab of a Popkin: the plan board, its stories and the burn-down (L1-017). Every action needs a session.</summary>
[ApiController]
[Route("api/popkins/{popkinId:guid}/plan")]
public sealed class PlanController(ISender sender) : ControllerBase
{
    /// <summary>The plan board (L2-068): the sprint, every story and how the sprint is going.</summary>
    [HttpGet]
    public async Task<ActionResult<PlanBoardDto>> GetBoard(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetPlanBoardQuery(popkinId), cancellationToken));

    /// <summary>The burn-down (L2-071): the points left, how far behind or ahead, the forecast, each day and the biggest open stories.</summary>
    [HttpGet("burn-down")]
    public async Task<ActionResult<BurnDownDto>> GetBurnDown(Guid popkinId, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new GetBurnDownQuery(popkinId), cancellationToken));

    /// <summary>The home's Plan section (L2-075 AC1): the points left, how far behind or ahead and the biggest open stories; 204 before the first story (AC3).</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<PlanSummaryDto>> GetSummary(Guid popkinId, CancellationToken cancellationToken) =>
        await sender.Send(new GetPlanSummaryQuery(popkinId), cancellationToken) is { } summary ? Ok(summary) : NoContent();

    /// <summary>Adds a story to Backlog or To do (L2-069). Counted with the caller's messages.</summary>
    [HttpPost("stories")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<StoryDto>> AddStory(Guid popkinId, AddStoryRequest request, CancellationToken cancellationToken)
    {
        var story = await sender.Send(
            new AddStoryCommand(popkinId, request.Title, request.Column, request.Points, request.OwnerMembershipId, request.Tag),
            cancellationToken);
        return Created($"/api/popkins/{popkinId}/plan/stories/{story.Id}", story);
    }

    /// <summary>Saves a change to a story's title, column, points, owner, tag or due date (L2-070 AC3). Counted with the caller's messages.</summary>
    [HttpPut("stories/{storyId:guid}")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<StoryDto>> SaveStory(Guid popkinId, Guid storyId, SaveStoryRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(
            new SaveStoryCommand(popkinId, storyId, request.Title, request.Column, request.Points, request.OwnerMembershipId, request.Tag, request.DueDate),
            cancellationToken));

    /// <summary>Moves a story to another column, last in it (L2-070 AC2). Counted with the caller's messages.</summary>
    [HttpPut("stories/{storyId:guid}/column")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<ActionResult<StoryDto>> MoveStory(Guid popkinId, Guid storyId, MoveStoryRequest request, CancellationToken cancellationToken) =>
        Ok(await sender.Send(new MoveStoryCommand(popkinId, storyId, request.Column), cancellationToken));

    /// <summary>Deletes a story, for the person who added it, its owner or the Host (L2-070 AC4). Counted with the caller's messages.</summary>
    [HttpDelete("stories/{storyId:guid}")]
    [EnableRateLimiting(RateLimitPolicyNames.Messages)]
    public async Task<IActionResult> DeleteStory(Guid popkinId, Guid storyId, CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteStoryCommand(popkinId, storyId), cancellationToken);
        return NoContent();
    }
}

public sealed record MoveStoryRequest(string? Column);

public sealed record SaveStoryRequest(string? Title, string? Column, int? Points, Guid? OwnerMembershipId, string? Tag, string? DueDate);

public sealed record AddStoryRequest(string? Title, string? Column, int? Points, Guid? OwnerMembershipId, string? Tag);
