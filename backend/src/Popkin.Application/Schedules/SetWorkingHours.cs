using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;
using Popkin.Application.Security;
using Popkin.Domain;

namespace Popkin.Application.Schedules;

/// <summary>The body of `PUT …/schedule/hours/{membershipId}`: the first of the seven days, and each day's stretches.</summary>
public sealed record SetWorkingHoursRequest(DateOnly From, IReadOnlyList<IReadOnlyList<StretchDto>?>? Days);

/// <summary>
/// A member sets their own working hours for the seven days from `From` (L2-074 AC8): each day up
/// to two stretches on the quarter hour; a blank day is a day not working. Answers this week.
/// </summary>
public sealed record SetWorkingHoursCommand(Guid PopkinId, Guid MembershipId, DateOnly From, IReadOnlyList<IReadOnlyList<StretchDto>?>? Days)
    : IRequest<ThisWeekDto>;

public sealed class SetWorkingHoursCommandHandler(
    IAppDbContext db, IFeatureSwitches features, IMembershipGuard guard, IPhotoStore photos, IPopkinNotifier notifier, TimeProvider clock)
    : IRequestHandler<SetWorkingHoursCommand, ThisWeekDto>
{
    public async Task<ThisWeekDto> Handle(SetWorkingHoursCommand request, CancellationToken cancellationToken)
    {
        features.Require(Feature.Schedules, request.PopkinId);
        // Nothing new is added to a Popkin that has wrapped up (L2-045 AC2).
        var (popkin, membership) = await guard.RequireActiveMemberAsync(request.PopkinId, cancellationToken);
        if (request.MembershipId != membership.Id)
        {
            throw SetTimeOffCommandHandler.NotYours();
        }

        if (!ScheduleRules.IsWithinAYear(request.From, DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime)))
        {
            throw ProblemException.Invalid("too_far_ahead", "Working hours can be entered up to a year ahead.", "from");
        }

        var days = DaysOf(request.Days);
        var last = request.From.AddDays(ScheduleRules.DaysInAWeek - 1);
        var held = await db.WorkingStretches
            .Where(s => s.MembershipId == membership.Id && s.Day >= request.From && s.Day <= last)
            .ToListAsync(cancellationToken);
        db.WorkingStretches.RemoveRange(held);
        for (var i = 0; i < days.Count; i++)
        {
            for (var index = 0; index < days[i].Count; index++)
            {
                var stretch = days[i][index];
                db.WorkingStretches.Add(WorkingStretch.Of(membership.Id, request.From.AddDays(i), index, stretch.StartMinute, stretch.EndMinute));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        // The members with the view open read their week again.
        await notifier.ScheduleChanged(popkin.Id);
        return await ThisWeeks.ReadAsync(db, photos, popkin, membership, request.From, cancellationToken);
    }

    /// <summary>Seven days, each up to two stretches of times "HH:mm" that keep the rules of a day.</summary>
    private static List<List<Stretch>> DaysOf(IReadOnlyList<IReadOnlyList<StretchDto>?>? days)
    {
        if (days is not { Count: ScheduleRules.DaysInAWeek })
        {
            throw Invalid();
        }

        return days.Select(day =>
        {
            var stretches = (day ?? []).Select(s =>
                WorkingHours.MinutesOf(s.Start) is { } start && WorkingHours.MinutesOf(s.End) is { } end
                    ? new Stretch(start, end)
                    : throw Invalid()).ToList();
            return WorkingHours.IsValid(stretches) ? stretches : throw Invalid();
        }).ToList();
    }

    private static ProblemException Invalid() =>
        ProblemException.Invalid(
            "invalid_hours", "Each day is up to two stretches on the quarter hour, each ending after it starts.", "days");
}
