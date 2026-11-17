using MediatR;
using Microsoft.AspNetCore.Mvc;
using Popkin.Application.Contacts.Habits;

namespace Popkin.Api.Controllers.Contacts;

/// <summary>The rhythms a person keeps with their contacts (L1-035). Only the caller's own are seen or changed (L2-122).</summary>
[ApiController]
[Route("api/contacts/habits")]
public sealed class HabitsController(ISender sender) : ControllerBase
{
    /// <summary>Habits (L2-143): every running habit with its days kept; the web app counts the strip.</summary>
    [HttpGet]
    public Task<IReadOnlyList<HabitDto>> List(CancellationToken cancellationToken) =>
        sender.Send(new GetHabitsQuery(), cancellationToken);

    /// <summary>"Start the habit" (L2-145): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost]
    public async Task<ActionResult<HabitDto>> Start(StartHabitRequest habit, CancellationToken cancellationToken)
    {
        var started = await sender.Send(new StartHabitCommand(habit), cancellationToken);
        return started.Created ? Created($"/api/contacts/habits/{started.Habit.Id}", started.Habit) : Ok(started.Habit);
    }

    /// <summary>"We met up" (L2-144 AC1): 201, or 200 for a resend under the same client id.</summary>
    [HttpPost("{habitId:guid}/kept")]
    public async Task<ActionResult<HabitKeptDto>> Keep(Guid habitId, KeepHabitRequest keep, CancellationToken cancellationToken)
    {
        var kept = await sender.Send(new KeepHabitCommand(habitId, keep), cancellationToken);
        return kept.Created ? Created($"/api/contacts/habits/{habitId}/kept/{kept.Kept.KeptId}", kept.Kept) : Ok(kept.Kept);
    }

    /// <summary>"Undo" of "We met up" (L2-144 AC2).</summary>
    [HttpDelete("{habitId:guid}/kept/{keptId:guid}")]
    public Task<HabitDto> Unkeep(Guid habitId, Guid keptId, CancellationToken cancellationToken) =>
        sender.Send(new UnkeepHabitCommand(habitId, keptId), cancellationToken);

    /// <summary>"End this habit" (L2-144 AC3).</summary>
    [HttpPost("{habitId:guid}/end")]
    public async Task<IActionResult> End(Guid habitId, CancellationToken cancellationToken)
    {
        await sender.Send(new EndHabitCommand(habitId), cancellationToken);
        return NoContent();
    }

    /// <summary>"Undo" of "End this habit" (L2-144 AC3).</summary>
    [HttpDelete("{habitId:guid}/end")]
    public Task<HabitDto> Resume(Guid habitId, CancellationToken cancellationToken) =>
        sender.Send(new ResumeHabitCommand(habitId), cancellationToken);
}
