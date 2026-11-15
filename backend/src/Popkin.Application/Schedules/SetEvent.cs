using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>`PUT /api/popkins/{popkinId}/event`: what the group gets together for, and its days.</summary>
public sealed record SetEventRequest(string? Label, DateOnly FirstDay, DateOnly LastDay);

/// <summary>The Host sets the event, which time off marks for every member (L2-085 AC4).</summary>
public sealed record SetEventCommand(Guid PopkinId, string? Label, DateOnly FirstDay, DateOnly LastDay) : IRequest<EventDto>;

public sealed class SetEventCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier, TimeProvider clock)
    : IRequestHandler<SetEventCommand, EventDto>
{
    public async Task<EventDto> Handle(SetEventCommand request, CancellationToken cancellationToken)
    {
        // The switch, then who may ask and whether the Popkin is open, then what was asked.
        features.Require(Feature.Schedules, request.PopkinId);
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        var label = request.Label?.Trim() ?? string.Empty;
        if (label.Length is 0 or > PopkinRules.MaxEventLabelLength)
        {
            throw ProblemException.Invalid("invalid_event", "Give the event a label of up to 40 characters.", "label");
        }

        if (request.LastDay < request.FirstDay)
        {
            throw ProblemException.Invalid("invalid_event", "The last day is before the first day.", "lastDay");
        }

        if (!ScheduleRules.IsWithinAYear(request.FirstDay, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime)))
        {
            throw ProblemException.Invalid("invalid_event", "The event can be set up to a year ahead.", "firstDay");
        }

        popkin.SetEvent(label, request.FirstDay, request.LastDay);
        await db.SaveChangesAsync(cancellationToken);
        await notifier.ScheduleChanged(popkin.Id);
        return EventDto.Of(popkin)!;
    }
}

/// <summary>The Host removes the event; time off opens on the current week again (L2-085 AC5).</summary>
public sealed record RemoveEventCommand(Guid PopkinId) : IRequest;

public sealed class RemoveEventCommandHandler(IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPopkinNotifier notifier)
    : IRequestHandler<RemoveEventCommand>
{
    public async Task Handle(RemoveEventCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Schedules, request.PopkinId);
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        popkin.RemoveEvent();
        await db.SaveChangesAsync(cancellationToken);
        await notifier.ScheduleChanged(popkin.Id);
    }
}
